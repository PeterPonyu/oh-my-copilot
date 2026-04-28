"""Replay a recorded JSONL file as a human-readable transcript."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def _truncate(s: Any, n: int = 200) -> str:
    if not isinstance(s, str):
        s = json.dumps(s, ensure_ascii=False)
    s = s.replace("\n", " ")
    if len(s) > n:
        return s[:n] + "..."
    return s


def render(path: Path) -> str:
    out: list[str] = []
    with path.open("r", encoding="utf-8") as fp:
        for line in fp:
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                out.append(f"!! malformed line: {line[:80]}")
                continue
            ts = ev.get("ts", "")
            etype = ev.get("event_type", "")
            rid = ev.get("run_id", "")

            if etype == "run_start":
                out.append(
                    f"== RUN START {rid} [{ts}] benchmark={ev.get('benchmark')} "
                    f"arm={ev.get('arm')} model={ev.get('model')} "
                    f"budget=${ev.get('budget_usd')} fallback={ev.get('fallback_model')} =="
                )
            elif etype == "task_start":
                out.append(f">> TASK {ev.get('task_id')} [{ts}]")
                out.append(f"   prompt: {_truncate(ev.get('prompt', ''))}")
            elif etype == "request":
                out.append(f"   -> request: {_truncate(ev.get('payload'))}")
            elif etype == "response":
                tok = ev.get("tokens") or {}
                tok_s = ",".join(f"{k}={v}" for k, v in tok.items())
                wc = ev.get("wallclock_ms")
                out.append(
                    f"   <- response ({wc}ms, tokens={tok_s}, "
                    f"${ev.get('cost_usd', 0):.6f}) | total ${ev.get('running_total_usd', 0):.6f}"
                )
                out.append(f"      body: {_truncate(ev.get('payload'))}")
            elif etype == "tool_call":
                out.append(f"   ::tool {ev.get('name')}({_truncate(ev.get('args'))})")
            elif etype == "tool_result":
                out.append(f"   ::result {ev.get('name')} = {_truncate(ev.get('result'))}")
            elif etype == "rubric_score":
                rater = ev.get("rater", "self")
                out.append(
                    f"   == RUBRIC ({rater}): total={ev.get('total')} "
                    f"{json.dumps(ev.get('rubric', {}), ensure_ascii=False)}"
                )
            elif etype == "task_end":
                err = ev.get("error")
                err_s = f" error={err}" if err else ""
                out.append(f"   << TASK END {ev.get('task_id')}: {ev.get('status')}{err_s}")
            elif etype == "fallback_triggered":
                out.append(
                    f"!! FALLBACK {ev.get('from_model')} -> {ev.get('to_model')} "
                    f"(spent ${ev.get('spent_usd')})"
                )
            elif etype == "budget_warning":
                out.append(
                    f"!! BUDGET WARNING at {int(ev.get('threshold', 0)*100)}%: "
                    f"spent ${ev.get('spent_usd')} / ${ev.get('budget_usd')}"
                )
            elif etype == "budget_exceeded":
                out.append(
                    f"!! BUDGET EXCEEDED: spent ${ev.get('spent_usd')} / ${ev.get('budget_usd')}"
                )
            elif etype == "error":
                out.append(f"!! ERROR task={ev.get('task_id')} kind={ev.get('kind')}: {ev.get('message')}")
            elif etype == "run_end":
                out.append(
                    f"== RUN END {rid}: {ev.get('status')} total ${ev.get('total_spent_usd')} "
                    f"wallclock {ev.get('wallclock_seconds')}s =="
                )
            else:
                out.append(f"   ?? {etype}: {_truncate(ev)}")
    return "\n".join(out)


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: python -m benchmark.runs.replay <file.jsonl>", file=sys.stderr)
        return 2
    path = Path(argv[1])
    if not path.exists():
        print(f"error: {path} not found", file=sys.stderr)
        return 1
    print(render(path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
