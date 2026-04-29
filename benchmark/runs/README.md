# benchmark/runs — append-only run recorder

This package captures every benchmark invocation as an append-only JSONL
event stream **plus** a structured per-run directory so a human can
audit any past run at multiple levels of granularity without
re-executing it.

## Layout

```
benchmark/runs/
  recorder.py          # Recorder class + PRICING table
  anthropic_client.py  # zero-dep Anthropic Messages API client (urllib only)
  replay.py            # python -m benchmark.runs.replay <events.jsonl|run_dir>
  budget_guard.py      # python -m benchmark.runs.budget_guard <events.jsonl>
  summary.py           # python -m benchmark.runs.summary <events.jsonl>
  schema.md            # event schema + per-run directory layout
  data/                # output run-dirs (gitignored)
  pilot/
    a1_tasks.json      # 3 sample A1 tasks
    run_a1_pilot.py    # Copilot OAuth CLI pilot; sliceable by --limit/--arm
```

## Per-run directory layout

```
data/<UTC_TS>__<benchmark>__<arm>__<model_flat>__<run_id>/
  manifest.json          # config + final spend + status
  events.jsonl           # canonical append-only event log
  summary.csv            # one-line per-run summary
  replay.txt             # auto-generated human-readable transcript
  per-task/<task_id>/
    prompt.md            # raw prompt sent (system + user, delimited)
    response.md          # assistant reply, raw markdown
    metadata.json        # tokens, cost, wallclock, model, status
    request.json         # full request body for replay
    response_raw.json    # full response body
```

`events.jsonl` is the canonical source of truth. The other files are
convenience views derived from the same data — they are written
incrementally as the run progresses, so an in-flight run is still
inspectable.

See `schema.md` for the full event reference and field-by-field layout.

## Recording a run

```python
from benchmark.runs.recorder import Recorder

rec = Recorder(
    benchmark="A1",
    arm="with-omc",
    model="anthropic/claude-haiku-4-5-20251001",
    budget_usd=2.00,
    fallback_model=None,
)
rec.task_start("t-001", prompt="...", metadata={"skill": "plan"})
rec.request("t-001", payload={"model": "...", "messages": [...]})
rec.response(
    "t-001",
    payload={...},                              # raw model response
    tokens={"in": 120, "out": 480},
    wallclock_ms=1820,
)
rec.task_end("t-001", status="ok")
rec.run_end(status="ok")
```

`run_end()` finalizes the per-run artifacts: it writes the final
`manifest.json`, the per-run `summary.csv`, and renders `replay.txt`
in-process from `events.jsonl`.

Every event is appended immediately and `flush()`ed, so a crash mid-run
still leaves a valid audit trail.

## Replaying / auditing

```bash
# Render the transcript that was auto-generated at run_end:
cat benchmark/runs/data/<run_dir>/replay.txt

# Or re-render from events.jsonl on demand:
python -m benchmark.runs.replay benchmark/runs/data/<run_dir>/events.jsonl
python -m benchmark.runs.summary benchmark/runs/data/<run_dir>/events.jsonl
python -m benchmark.runs.budget_guard benchmark/runs/data/<run_dir>/events.jsonl
```

To inspect a single task in isolation, just `cat` its per-task files:

```bash
ls benchmark/runs/data/<run_dir>/per-task/<task_id>/
cat benchmark/runs/data/<run_dir>/per-task/<task_id>/prompt.md
cat benchmark/runs/data/<run_dir>/per-task/<task_id>/response.md
cat benchmark/runs/data/<run_dir>/per-task/<task_id>/metadata.json
```

## Budget guard semantics

- `budget_usd` is a hard cap. `0` disables the cap.
- At 80% of the cap, a single `budget_warning` event is emitted; the run
  continues.
- At 100% of the cap:
  - if `fallback_model` is set, a `fallback_triggered` event is emitted
    and subsequent calls bill against the fallback model;
  - otherwise a `budget_exceeded` event is emitted and `response()`
    returns `"abort"` so the caller can stop.
- Costs are computed via the `PRICING` table in `recorder.py`. Unknown
  models cost `0` and emit `pricing_known: false` in `run_start`.

## Pricing table (per million tokens, USD)

| model                                   | in   | out  | cache_read | cache_write |
| --------------------------------------- | ---- | ---- | ---------- | ----------- |
| anthropic/claude-haiku-4-5-20251001     | 1.00 | 5.00 | 0.10       | 1.25        |
| anthropic/claude-sonnet-4-6             | 3.00 | 15.0 | 0.30       | 3.75        |
| anthropic/claude-opus-4-7               | 15.0 | 75.0 | 1.50       | 18.75       |
| openai/gpt-4o-mini                      | 0.15 | 0.60 | —          | —           |

Copilot CLI runs are priced by `premiumRequests`, not by local token pricing.
`github/copilot-cli` and `github/copilot-cli/<model>` use the recorder's
premium-request proxy rate; current OAuth smoke evidence for `gpt-5-mini` reports
`premiumRequests=0` in this account.

## Event types

See `schema.md`. Briefly: `run_start`, `task_start`, `request`,
`response`, `tool_call`, `tool_result`, `rubric_score`, `task_end`,
`error`, `budget_warning`, `fallback_triggered`, `budget_exceeded`,
`run_end`.

## Pilot

The `pilot/` directory ships a tiny end-to-end demonstration that uses the
**authenticated GitHub Copilot CLI host product**. It is not a Claude, Ollama,
BYOK, or local-provider approximation. The runner rejects Copilot BYOK/provider
environment overrides such as `COPILOT_PROVIDER_BASE_URL` so evidence stays on
the OAuth-backed Copilot path.

```bash
# bounded smoke, one task per arm, using the account-backed free/included model
python3 benchmark/runs/pilot/run_a1_pilot.py --model gpt-5-mini --limit 1 --arm both

# 3-task pilot, both arms
python3 benchmark/runs/pilot/run_a1_pilot.py --model gpt-5-mini --arm both

# 60-task A1 full, sliceable by --limit/--arm
python3 benchmark/runs/run_a1_full.py --model gpt-5-mini --limit 5 --arm vanilla
```

`gpt-5-mini` is the default because this local OAuth account verified it as the
newest free/included Copilot model with `premiumRequests=0` in bounded smokes.
Use authenticated host-account model calls for valid evidence; local Ollama or
other local-provider runs are invalid for Copilot host-product verification.
Cursor remains the auto-mode proof surface in this task because
`cursor-agent --list-models` reports `auto - Auto (current)`.

The script records one run-dir per arm under `data/` and prints their paths.
Each run-dir is self-contained: `manifest.json`, `events.jsonl`, `summary.csv`,
`replay.txt`, and a `per-task/` tree.

## Copilot OAuth model proof vs local-provider proof

This repository no longer treats local Ollama as the recommended free-model
proof. For this benchmark task, the proof surface is:

- **Copilot:** `github/copilot-cli/<model>` via the real `copilot` binary,
  authenticated by the user's Copilot OAuth session. The runner records
  `auth_backend=github_copilot_oauth`, forwards `--model`, rejects BYOK/local
  provider overrides, and records Copilot's own `premiumRequests` counter.
- **Cursor:** `cursor/auto` via the real `cursor-agent --model auto` binary,
  authenticated by the user's Cursor session.

Do not use local Ollama runs as quality evidence for Copilot or Cursor host
products. Existing historical Ollama artifacts under ignored `data/` directories
may remain as stale local experiments, but new proof should use the OAuth-backed
CLI model calls above.
