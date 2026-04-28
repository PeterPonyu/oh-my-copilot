"""A1 pilot: 3 tasks x 2 arms = 6 invocations against the **real GitHub
Copilot CLI**, fully recorded.

Arms:
  - ``vanilla``  — runs ``copilot`` from a fresh empty tempdir (no
    project-local ``.github/skills/`` to auto-load). Personal/builtin
    skills still load (those are global to the CLI, not cwd-scoped).
  - ``with-omc`` — runs ``copilot`` from this repo's root, so the 13
    ported OMC skills under ``.github/skills/`` auto-load alongside.

This is NOT a Claude approximation; the host CLI is the system under test.
"""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path

# allow `python3 benchmark/runs/pilot/run_a1_pilot.py` from repo root
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

from benchmark.runs.host_client import CopilotError, call_copilot  # noqa: E402
from benchmark.runs.recorder import Recorder  # noqa: E402

RECORDER_MODEL = "github/copilot-cli"
TASKS_PATH = Path(__file__).parent / "a1_tasks.json"
WITH_OMC_CWD = ROOT  # /home/zeyufu/Desktop/oh-my-copilot
PREMIUM_REQUEST_BUDGET = 50  # ~ $2 cap at $0.04/request
COPILOT_TIMEOUT_S = 240.0


def run_arm(arm: str, tasks: list[dict], workdir: str) -> Path:
    rec = Recorder(
        benchmark="A1",
        arm=arm,
        model=RECORDER_MODEL,
        budget_usd=PREMIUM_REQUEST_BUDGET * 0.04,
        fallback_model=None,
    )
    print(f"[arm={arm}] cwd      -> {workdir}")
    print(f"[arm={arm}] run_dir  -> {rec.run_dir}")
    print(f"[arm={arm}]   events -> {rec.events_path}")

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

        try:
            result = call_copilot(
                prompt=user,
                workdir=workdir,
                timeout=COPILOT_TIMEOUT_S,
            )
        except CopilotError as exc:
            print(f"[arm={arm}] task={task['id']} CopilotError: {exc}", file=sys.stderr)
            rec.error(task["id"], str(exc), kind="CopilotError")
            rec.task_end(task["id"], status="error", error=str(exc))
            continue
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[arm={arm}] task={task['id']} {type(exc).__name__}: {exc}", file=sys.stderr)
            rec.error(task["id"], str(exc), kind=type(exc).__name__)
            rec.task_end(task["id"], status="error", error=str(exc))
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
        n_skills = len(result["skills_loaded"])
        print(
            f"[arm={arm}] task={task['id']} "
            f"premium_requests={result['premium_requests']} "
            f"wallclock_ms={result['wallclock_ms']} "
            f"skills_loaded={n_skills} "
            f"text_event_types={result['visible_text_event_types']}"
        )
        rec.task_end(task["id"], status="ok")

    rec.run_end(status="ok")
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
    print(f"Budget: {PREMIUM_REQUEST_BUDGET} premium_requests "
          f"(~${PREMIUM_REQUEST_BUDGET * 0.04:.2f} estimated)")
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
