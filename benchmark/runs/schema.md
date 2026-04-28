# Recorder layout & event schema

## Per-run directory layout

Each call to ``Recorder()`` creates a self-contained subdirectory under
``data/`` with this layout:

```
data/<UTC_TS>__<benchmark>__<arm>__<model_flat>__<run_id>/
  manifest.json          # config + final spend + status
  events.jsonl           # canonical append-only event log (this schema)
  summary.csv            # one-line per-run summary
  replay.txt             # auto-generated human-readable transcript
  per-task/
    <task_id>/
      prompt.md          # raw prompt sent (system + user, delimited)
      response.md        # assistant reply, raw markdown
      metadata.json      # { tokens, cost_usd, wallclock_ms, model, status }
      request.json       # full request body for replay
      response_raw.json  # full response body
```

The directory name uses ``__`` (double underscore) as the field
separator so the model id (which itself contains single underscores
after flattening) remains parseable.

### `manifest.json`
- `run_id`, `benchmark`, `arm`
- `initial_model`, `current_model`, `fallback_model`, `fallback_active`
- `budget_usd`, `pricing_known`
- `started_at_utc`, `ended_at_utc`, `status`
- `running_total_usd`, `n_tasks`, `n_responses`, `n_errors`
- `tokens_in`, `tokens_out`, `wallclock_seconds`
- `premium_requests_total` (Copilot CLI only — billing is per-request, not per-token)
- `events_path`, `summary_path`, `replay_path` (relative to run dir)

#### Pricing model for `github/copilot-cli`
Copilot does NOT expose token counts; it bills in **premium requests**. The
recorder estimates cost as `cost_usd = premium_requests * 0.04`, where
`$0.04/request` is derived from Copilot Pro's $10/month allowance ÷ ~250
included premium requests. This is a rough proxy for tracking — actual
billing is monthly-allowance-based, not per-call.

The manifest is rewritten at ``run_start`` (with `status: "running"`)
and again at ``run_end`` with the final totals.

### `summary.csv`
A single header row plus a single data row, identical schema to the
former top-level summary:

```
run_id,benchmark,arm,model,n_tasks,total_tokens_in,total_tokens_out,total_cost_usd,wallclock_seconds,n_errors
```

### `replay.txt`
Auto-generated at ``run_end`` by calling
``benchmark.runs.replay.render`` against ``events.jsonl``.

### `per-task/<task_id>/prompt.md`
Plain UTF-8 markdown shaped for grep:

```
## System message

<system prompt or "(no system message)">

## User prompt

<user prompt>
```

### `per-task/<task_id>/response.md`
The raw assistant reply (joined text blocks for Anthropic; Copilot CLI
``assistant.message`` / ``assistant.message_delta`` events; OpenAI-style
``choices[0].message.content``).

### `per-task/<task_id>/metadata.json`
Per-task convenience view:

```
{
  "task_id": "...",
  "started_at_utc": "...",
  "ended_at_utc": "...",
  "metadata": { "skill": "plan", "arm": "with-omc" },
  "model": "anthropic/claude-haiku-4-5-20251001",
  "tokens": { "in": 120, "out": 480, "cache_read": 0, "cache_write": 0 },
  "cost_usd": 0.00012,
  "wallclock_ms": 1820,
  "status": "ok",
  "error": null
}
```

### `per-task/<task_id>/request.json` and `response_raw.json`
The full request body and full response body as sent to / received from
the model API. These are the source of truth for replay.

## Event schema (`events.jsonl`)

Every line is a single JSON object. All events share three required
fields:

| field        | type   | description                                  |
| ------------ | ------ | -------------------------------------------- |
| `ts`         | string | ISO-8601 UTC timestamp at second precision.  |
| `run_id`     | string | 12-char hex id assigned at recorder init.    |
| `event_type` | string | One of the types documented below.           |

The remaining fields are event-specific.

### `run_start`
Emitted once when `Recorder()` is constructed.
- `benchmark` (string) — benchmark id, e.g. `A1`.
- `arm` (string) — experimental arm, e.g. `vanilla`, `with-omc`.
- `model` (string) — initial model identifier (matches `PRICING` keys when known).
- `budget_usd` (number) — hard USD cap; `0` disables the cap.
- `fallback_model` (string|null) — model used after cap exhaustion.
- `pricing_known` (bool) — whether the model has a `PRICING` entry.

### `task_start`
- `task_id` (string)
- `prompt` (string) — full prompt sent to the system under test.
- `metadata` (object) — free-form, e.g. `{ "skill": "plan" }`.

### `request`
What we sent to the model layer.
- `task_id` (string)
- `payload` (object) — the full request body (messages, system, options, ...).
- `model` (string) — model used for this request.

### `response`
- `task_id` (string)
- `payload` (object) — model reply body (raw or normalized).
- `tokens` (object) — `{ "in": int, "out": int, ... }`. Cache fields like
  `cache_read` / `cache_write` may also be set.
- `cost_usd` (number) — incremental USD for this call.
- `running_total_usd` (number) — total USD spent across the run so far.
- `wallclock_ms` (number|null) — wall-clock latency for this call.
- `model` (string) — model that produced the response.

### `tool_call`
- `task_id` (string)
- `name` (string)
- `args` (object)

### `tool_result`
- `task_id` (string)
- `name` (string)
- `result` (any)

### `rubric_score`
- `task_id` (string)
- `rubric` (object) — sub-criterion scores, e.g. `{ "correctness": 0.7 }`.
- `total` (number)
- `rater` (string) — `"self"`, `"verifier"`, `"human"`, etc.

### `task_end`
- `task_id` (string)
- `status` (string) — `"ok"` or any failure tag.
- `error` (string|null)

### `error`
- `task_id` (string|null)
- `message` (string)
- `kind` (string) — exception class or category.

### `budget_warning`
Emitted once when the running total crosses 80% of the cap.
- `spent_usd` (number)
- `budget_usd` (number)
- `threshold` (number) — `0.8`.

### `fallback_triggered`
Emitted once when the cap is reached and a fallback model exists.
- `from_model` (string)
- `to_model` (string)
- `spent_usd` (number)

### `budget_exceeded`
Emitted when the cap is reached and **no** fallback model is configured.
- `spent_usd` (number)
- `budget_usd` (number)

### `run_end`
- `status` (string) — `"ok"` or failure tag.
- `total_spent_usd` (number)
- `wallclock_seconds` (number)
- `fallback_active` (bool)

`events.jsonl` remains the canonical truth; the per-task files and
`manifest.json` are convenience views derived from the same data.
