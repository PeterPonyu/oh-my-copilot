# Copilot OAuth/free-model evidence report — 2026-04-28

Updated after the Ollama sidecar was rejected for this task. The active proof
surface is now the authenticated GitHub Copilot CLI itself, not a local model
provider.

## Boundary checks

- Copilot proof uses the real `copilot` binary with OAuth-backed GitHub Copilot
  authentication and explicit `--model gpt-4.1`.
- The runner records `auth_backend=github_copilot_oauth`, `model_arg`, and the
  exact CLI command in each per-task `request.json`.
- The runner rejects BYOK/local-provider overrides such as
  `COPILOT_PROVIDER_BASE_URL`, preventing accidental Ollama/vLLM evidence.
- Local Ollama run dirs from earlier experiments are superseded and should not
  be used as quality evidence for Copilot or Cursor host products.
- Cursor remains the auto-mode proof surface: `cursor-agent --list-models`
  reports `auto - Auto (current)` and Cursor runner commands forward
  `--model auto`.

## Copilot model preflight

- `copilot --version` → GitHub Copilot CLI 1.0.36.
- `copilot -p 'Reply with exactly: ok' --output-format json --allow-all-tools --model gpt-4.1` → PASS, `exitCode=0`, `premiumRequests=0`.
- `copilot ... --model auto` → environment-gated; this local account returned
  `402 You have no quota`, so `gpt-4.1` is the default free/included model for
  reproducible Copilot OAuth smokes here.
- `copilot ... --model gpt-5.4-mini` → environment-gated; this local account
  also returned `402 You have no quota`.

## Verification commands and results

- `python3 -m py_compile benchmark/runs/host_client.py benchmark/runs/pilot/run_a1_pilot.py benchmark/runs/run_a1_full.py benchmark/runs/recorder.py benchmark/runs/test_copilot_oauth.py` → PASS.
- `python3 -m unittest discover benchmark/runs -p 'test_*.py' -v` → PASS, 8 tests.
- `python3 benchmark/runs/pilot/run_a1_pilot.py --model gpt-4.1 --limit 1 --arm both --timeout 180` → PASS.
- `python3 benchmark/runs/run_a1_full.py --model gpt-4.1 --limit 1 --arm vanilla --timeout 180` → PASS.

## New OAuth-backed Copilot run completeness

|run dir|status|model|n_tasks|task_end|run_end|missing|premium|errors|
|---|---|---|---:|---:|---:|---|---:|---:|
|20260428T075845Z__A1__vanilla__github_copilot-cli_gpt-4.1__7e4e1ef2a54d|ok|github/copilot-cli/gpt-4.1|1|1|1|none|0|0|
|20260428T075915Z__A1__with-omc__github_copilot-cli_gpt-4.1__c1dce149ec8a|ok|github/copilot-cli/gpt-4.1|1|1|1|none|0|0|
|20260428T080013Z__A1-full__vanilla__github_copilot-cli_gpt-4.1__acf5e6e96883|ok|github/copilot-cli/gpt-4.1|1|1|1|none|0|0|

All three run dirs include `manifest.json`, `events.jsonl`, `summary.csv`,
`replay.txt`, and per-task prompt/request/response artifacts.

## Preserved stale-run audit

|run dir|status|model|task_end|run_end|missing|disposition|
|---|---|---|---:|---:|---|---|
|20260427T083059Z__A1-full__vanilla__github_copilot-cli__285e509a3894|running|github/copilot-cli|10|0|run_end, summary.csv, replay.txt|stale/superseded; preserve without rewriting|

## Remaining risks

- Full 60-task both-arm Copilot run is still environment/time gated; bounded
  OAuth smokes prove the selected model path, not a full quality comparison.
- `--model auto` on Copilot is not used as the default here because the local
  authenticated account currently has no auto quota; use it only when the
  account can prove `premiumRequests=0` or acceptable quota behavior.
