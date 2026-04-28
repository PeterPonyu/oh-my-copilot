"""A1-full against the OAuth-backed **real GitHub Copilot CLI**, fully recorded.

Mirrors ``pilot/run_a1_pilot.py`` but loads the 60-task fixture from
``pilot/a1_full_tasks.json`` and uses ``benchmark="A1-full"`` so the
recorder run-dir prefix differs from the 3-task pilot.

Arms:
  - ``vanilla``  — runs ``copilot`` from a fresh empty tempdir (no
    project-local ``.github/skills/`` to auto-load). Personal/builtin
    skills still load (those are global to the CLI, not cwd-scoped).
  - ``with-omc`` — runs ``copilot`` from this repo's root, so the 13
    ported OMC skills under ``.github/skills/`` auto-load alongside.

Per-arm budget: 200 premium-requests (~$8 at $0.04/request proxy). Per-task
errors are caught and logged — one bad task does not kill the run. Progress is
printed every 10 completed tasks per arm.  Use ``--limit`` for bounded smokes.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
import time
from pathlib import Path

# allow `python3 benchmark/runs/run_a1_full.py` from repo root
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from benchmark.runs.host_client import (  # noqa: E402
    CopilotError,
    build_copilot_command,
    call_copilot,
    ensure_oauth_backend,
)
from benchmark.runs.recorder import Recorder  # noqa: E402

DEFAULT_MODEL_ARG = "gpt-4.1"
TASKS_PATH = Path(__file__).parent / "pilot" / "a1_full_tasks.json"
WITH_OMC_CWD = ROOT  # /home/zeyufu/Desktop/oh-my-copilot
PREMIUM_REQUEST_BUDGET = 200  # ~ $8 cap at $0.04/request
COPILOT_TIMEOUT_S = 360.0
PROGRESS_EVERY = 10
MAX_RETRIES = 2
RETRY_BACKOFF_S = 8.0
ARMS = ("vanilla", "with-omc")


def _recorder_model(model_arg: str | None) -> str:
    return "github/copilot-cli" if not model_arg else f"github/copilot-cli/{model_arg}"


def _selected_arms(arm: str) -> tuple[str, ...]:
    return ARMS if arm == "both" else (arm,)


def _limited_tasks(tasks: list[dict], limit: int | None) -> list[dict]:
    if limit is None:
        return tasks
    if limit < 1:
        raise ValueError("--limit must be >= 1")
    return tasks[:limit]


def _request_payload(user: str, workdir: str, model_arg: str | None) -> dict:
    return {
        "backend": "copilot_cli",
        "auth_backend": "github_copilot_oauth",
        "model": _recorder_model(model_arg),
        "model_arg": model_arg,
        "workdir": workdir,
        "messages": [{"role": "user", "content": user}],
        "cmd": build_copilot_command("copilot", user, model=model_arg),
    }


def run_arm(
    arm: str,
    tasks: list[dict],
    workdir: str,
    *,
    model_arg: str | None,
    timeout: float,
) -> Path:
    recorder_model = _recorder_model(model_arg)
    rec = Recorder(
        benchmark="A1-full",
        arm=arm,
        model=recorder_model,
        budget_usd=PREMIUM_REQUEST_BUDGET * 0.04,
        fallback_model=None,
    )
    print(f"[arm={arm}] cwd      -> {workdir}")
    print(f"[arm={arm}] model    -> {model_arg or '(Copilot default)'}")
    print(f"[arm={arm}] run_dir  -> {rec.run_dir}")
    print(f"[arm={arm}]   events -> {rec.events_path}")

    n_total = len(tasks)
    done = 0
    errors = 0

    for task in tasks:
        user = task["prompt"]
        rec.task_start(
            task["id"],
            user,
            metadata={
                "skill": task["skill"],
                "arm": arm,
                "workdir": workdir,
                "auth_backend": "github_copilot_oauth",
                "model_arg": model_arg,
            },
        )

        rec.request(task["id"], _request_payload(user, workdir, model_arg))

        result = None
        last_exc: Exception | None = None
        for attempt in range(MAX_RETRIES):
            try:
                result = call_copilot(
                    prompt=user,
                    workdir=workdir,
                    model=model_arg,
                    timeout=timeout,
                )
                break
            except (CopilotError, Exception) as exc:
                last_exc = exc
                msg = str(exc).lower()
                transient = ("timed out" in msg or "tls" in msg or "network" in msg
                             or "socket" in msg or "disconnect" in msg or "503" in msg
                             or "504" in msg or "502" in msg or "429" in msg)
                if attempt < MAX_RETRIES - 1 and transient:
                    print(f"[arm={arm}] task={task['id']} retry {attempt+1} after transient: {exc}",
                          file=sys.stderr)
                    time.sleep(RETRY_BACKOFF_S)
                    continue
                break
        if result is None:
            exc = last_exc
            kind = type(exc).__name__ if exc else "UnknownError"
            print(f"[arm={arm}] task={task['id']} {kind}: {exc}", file=sys.stderr)
            rec.error(task["id"], str(exc), kind=kind)
            rec.task_end(task["id"], status="error", error=str(exc))
            errors += 1
            done += 1
            if done % PROGRESS_EVERY == 0:
                print(
                    f"[arm={arm}] {done}/{n_total} done, "
                    f"spent=${rec.running_total_usd:.4f}, errors={errors}"
                )
            continue

        tokens = {
            "in": result["tokens"]["input"],
            "out": result["tokens"]["output"],
            "cache_read": result["tokens"]["cache_read"],
            "cache_write": result["tokens"]["cache_write"],
            "premium_requests": result["premium_requests"],
        }
        rec.response(
            task["id"],
            payload=result["raw"],
            tokens=tokens,
            wallclock_ms=result["wallclock_ms"],
        )
        rec.task_end(task["id"], status="ok")
        done += 1
        if done % PROGRESS_EVERY == 0:
            print(
                f"[arm={arm}] {done}/{n_total} done, "
                f"spent=${rec.running_total_usd:.4f}, errors={errors}"
            )

    rec.run_end(status="ok")
    print(
        f"[arm={arm}] FINAL {done}/{n_total} done, "
        f"spent=${rec.running_total_usd:.4f}, errors={errors}"
    )
    return rec.run_dir


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Copilot A1-full through OAuth-backed Copilot CLI models."
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL_ARG,
        help="Copilot CLI --model value to forward explicitly (default: %(default)s).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Run only the first N tasks per selected arm for bounded smoke tests.",
    )
    parser.add_argument(
        "--arm",
        choices=(*ARMS, "both"),
        default="both",
        help="Which arm to run (default: both).",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=COPILOT_TIMEOUT_S,
        help=f"Copilot CLI timeout per task in seconds (default: {COPILOT_TIMEOUT_S:g}).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        ensure_oauth_backend()
    except CopilotError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    binary = shutil.which("copilot")
    if binary is None:
        print(
            "ERROR: copilot CLI not found on PATH.\n"
            "Install GitHub Copilot CLI and re-run.",
            file=sys.stderr,
        )
        return 2
    print(f"[copilot] binary -> {binary}", file=sys.stderr)

    try:
        tasks = _limited_tasks(
            json.loads(TASKS_PATH.read_text(encoding="utf-8")), args.limit
        )
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(f"Loaded {len(tasks)} tasks from {TASKS_PATH}")
    print(f"Model argument: --model {args.model} (recorded as {_recorder_model(args.model)})")
    print("Backend: OAuth-backed GitHub Copilot CLI (BYOK/local provider env must be unset)")
    print(
        f"Budget: {PREMIUM_REQUEST_BUDGET} premium_requests "
        f"(~${PREMIUM_REQUEST_BUDGET * 0.04:.2f} estimated) per arm"
    )
    print(f"Arms: {', '.join(_selected_arms(args.arm))}")
    print()

    vanilla_cwd = Path(tempfile.mkdtemp(prefix="copilot-vanilla-"))
    print(f"[vanilla] tempdir -> {vanilla_cwd} (empty, no .github/skills/)")
    print()

    out_dirs: list[Path] = []
    try:
        for arm in _selected_arms(args.arm):
            workdir = str(vanilla_cwd) if arm == "vanilla" else str(WITH_OMC_CWD)
            out_dirs.append(
                run_arm(arm, tasks, workdir, model_arg=args.model, timeout=args.timeout)
            )
            print()
    finally:
        try:
            shutil.rmtree(vanilla_cwd, ignore_errors=True)
            print(f"[cleanup] removed vanilla tempdir {vanilla_cwd}")
        except Exception as exc:  # pragma: no cover
            print(f"[cleanup] WARN: failed to remove {vanilla_cwd}: {exc}", file=sys.stderr)

    print("Run directories:")
    for d in out_dirs:
        print(f"  {d}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
