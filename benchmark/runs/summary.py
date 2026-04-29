"""Emit a one-line CSV summary for a recorded JSONL file."""

from __future__ import annotations

import json
import sys
from pathlib import Path


CSV_HEADER = (
    "run_id,benchmark,arm,model,n_tasks,total_tokens_in,total_tokens_out,"
    "total_cost_usd,wallclock_seconds,n_errors"
)


def summarize(path: Path) -> str:
    run_id = ""
    benchmark = ""
    arm = ""
    model = ""
    n_tasks = 0
    tin = 0
    tout = 0
    cost = 0.0
    wall = 0.0
    n_errors = 0
    with path.open("r", encoding="utf-8") as fp:
        for line in fp:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            etype = ev.get("event_type")
            if etype == "run_start":
                run_id = ev.get("run_id", "")
                benchmark = ev.get("benchmark", "")
                arm = ev.get("arm", "")
                model = ev.get("model", "")
            elif etype == "task_start":
                n_tasks += 1
            elif etype == "response":
                tok = ev.get("tokens") or {}
                tin += int(tok.get("in", 0) or 0)
                tout += int(tok.get("out", 0) or 0)
                cost += float(ev.get("cost_usd", 0.0))
            elif etype == "task_end" and ev.get("status") not in (None, "ok"):
                n_errors += 1
            elif etype == "error":
                n_errors += 1
            elif etype == "run_end":
                wall = float(ev.get("wallclock_seconds", 0.0))
                cost = float(ev.get("total_spent_usd", cost))
    return (
        f"{run_id},{benchmark},{arm},{model},{n_tasks},{tin},{tout},"
        f"{cost:.6f},{wall},{n_errors}"
    )


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: python -m benchmark.runs.summary <file.jsonl>", file=sys.stderr)
        return 2
    path = Path(argv[1])
    if not path.exists():
        print(f"error: {path} not found", file=sys.stderr)
        return 1
    print(CSV_HEADER)
    print(summarize(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
