"""A1-full: 60 tasks x 2 arms = 120 invocations against the **real GitHub
Copilot CLI**, fully recorded.

Mirrors ``pilot/run_a1_pilot.py`` but loads the 60-task fixture from
``pilot/a1_full_tasks.json`` and uses ``benchmark="A1-full"`` so the
recorder run-dir prefix differs from the 3-task pilot.

Arms:
  - ``vanilla``  — runs ``copilot`` from a fresh empty tempdir (no
    project-local ``.github/skills/`` to auto-load). Personal/builtin
    skills still load (those are global to the CLI, not cwd-scoped).
  - ``with-omc`` — runs ``copilot`` from this repo's root, so the 13
    ported OMC skills under ``.github/skills/`` auto-load alongside.

Per-arm budget: 200 premium-requests (~$8 at $0.04/request). Per-task
errors are caught and logged — one bad task does not kill the run.
Progress is printed every 10 completed tasks per arm.
"""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
import time
from pathlib import Path

# allow `python3 benchmark/runs/run_a1_full.py` from repo root
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from benchmark.runs.host_client import CopilotError, call_copilot  # noqa: E402
from benchmark.runs.recorder import Recorder  # noqa: E402

RECORDER_MODEL = "github/copilot-cli"
TASKS_PATH = Path(__file__).parent / "pilot" / "a1_full_tasks.json"
WITH_OMC_CWD = ROOT  # /home/zeyufu/Desktop/oh-my-copilot
PREMIUM_REQUEST_BUDGET = 200  # ~ $8 cap at $0.04/request
COPILOT_TIMEOUT_S = 360.0
PROGRESS_EVERY = 10
MAX_RETRIES = 2
RETRY_BACKOFF_S = 8.0


def run_arm(arm: str, tasks: list[dict], workdir: str) -> Path:
    rec = Recorder(
        benchmark="A1-full",
        arm=arm,
        model=RECORDER_MODEL,
        budget_usd=PREMIUM_REQUEST_BUDGET * 0.04,
        fallback_model=None,
    )
    print(f"[arm={arm}] cwd      -> {workdir}")
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
            metadata={"skill": task["skill"], "arm": arm, "workdir": workdir},
        )

        request_payload = {
            "backend": "copilot_cli",
            "model": RECORDER_MODEL,
            "workdir": workdir,
            "messages": [{"role": "user", "content": user}],
        }
        rec.request(task["id"], request_payload)

        result = None
        last_exc: Exception | None = None
        for attempt in range(MAX_RETRIES):
            try:
                result = call_copilot(
                    prompt=user,
                    workdir=workdir,
                    timeout=COPILOT_TIMEOUT_S,
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


def main() -> int:
    binary = shutil.which("copilot")
    if binary is None:
        print(
            "ERROR: copilot CLI not found on PATH.\n"
            "Install GitHub Copilot CLI and re-run.",
            file=sys.stderr,
        )
        return 2
    print(f"[copilot] binary -> {binary}", file=sys.stderr)

    tasks = json.loads(TASKS_PATH.read_text(encoding="utf-8"))
    print(f"Loaded {len(tasks)} tasks from {TASKS_PATH}")
    print(f"Model: {RECORDER_MODEL}")
    print(
        f"Budget: {PREMIUM_REQUEST_BUDGET} premium_requests "
        f"(~${PREMIUM_REQUEST_BUDGET * 0.04:.2f} estimated) per arm"
    )
    print()

    vanilla_cwd = Path(tempfile.mkdtemp(prefix="copilot-vanilla-"))
    print(f"[vanilla] tempdir -> {vanilla_cwd} (empty, no .github/skills/)")
    print()

    out_dirs: list[Path] = []
    try:
        out_dirs.append(run_arm("vanilla", tasks, str(vanilla_cwd)))
        print()
        out_dirs.append(run_arm("with-omc", tasks, str(WITH_OMC_CWD)))
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
