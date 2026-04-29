"""Inspect a recorded JSONL file's budget consumption."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def summarize(path: Path) -> dict:
    total = 0.0
    n_tasks = 0
    n_responses = 0
    n_fallback = 0
    last_total = 0.0
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
            if etype == "task_start":
                n_tasks += 1
            elif etype == "response":
                n_responses += 1
                total += float(ev.get("cost_usd", 0.0))
                last_total = float(ev.get("running_total_usd", last_total))
            elif etype == "fallback_triggered":
                n_fallback += 1
            elif etype == "run_end":
                last_total = float(ev.get("total_spent_usd", last_total))
    return {
        "total_usd": last_total or total,
        "n_tasks": n_tasks,
        "n_responses": n_responses,
        "n_fallback": n_fallback,
    }


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: python -m benchmark.runs.budget_guard <file.jsonl>", file=sys.stderr)
        return 2
    path = Path(argv[1])
    if not path.exists():
        print(f"error: {path} not found", file=sys.stderr)
        return 1
    s = summarize(path)
    print(
        f"total spent: ${s['total_usd']:.2f}, "
        f"n_tasks: {s['n_tasks']}, "
        f"n_responses: {s['n_responses']}, "
        f"n_fallback_events: {s['n_fallback']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
