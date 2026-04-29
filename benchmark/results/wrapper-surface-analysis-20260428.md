# Copilot wrapper-surface benchmark analysis — 2026-04-28

Valid proof uses the authenticated GitHub Copilot CLI with `--model gpt-5-mini`. Ollama/local-provider runs are invalid for Copilot host-product claims.

## Score analysis

|profile|variant|score|threshold|gate|
|---|---|---:|---:|---|
|`quick`|`vanilla`|90/90|90/90|PASS|
|`quick`|`enhanced`|160/160|160/160|PASS|
|`full`|`vanilla`|85/85|85/85|PASS|
|`full`|`enhanced`|145/145|145/145|PASS|

- Quick enhanced uplift over vanilla floor: **+70** points.
- Full enhanced uplift over vanilla floor: **+60** points.
- Because both enhanced profiles are saturated, refinement should add provenance/surface checks instead of inflating generic task-smoke scores.

## Wrapper surface matrix

|surface|status|proof|refinement|
|---|---|---|---|
|`host_cli_model`|covered|benchmark/runs/host_client.py, benchmark/runs/test_copilot_oauth.py, scripts/smoke-copilot-cli.sh|model-backed smoke defaults to gpt-5-mini, not auto or local providers|
|`root_agents_prompts_instructions`|covered|.github/agents, .github/prompts, .github/instructions, scripts/validate-root-copilot-surfaces.sh|keep prompt smoke tied to root reviewer/research/verifier routes|
|`skills`|covered|scripts/validate-power-surfaces.sh, scripts/validate-root-copilot-surfaces.sh|score skills through discovery and task-command questions rather than raw file count|
|`hooks`|covered|scripts/prove-vscode-hook-standalone.sh, scripts/validate-root-copilot-surfaces.sh|full profile keeps standalone hook proof separate from model prompt proof|
|`plugin_package`|covered|packages/copilot-cli-plugin/plugin.json, scripts/check-install-state.sh, scripts/validate-copilot-state-contract.sh|install-state proof must reject transient OMX/team worktree source paths|
|`run_artifacts`|covered|benchmark/runs/audit_runs.py, benchmark/runs/free-model-report-20260428.md|new gpt-5-mini run dirs supersede local/Ollama experiments|

## Authenticated run evidence

|run dir|status|model|tasks|premium|errors|artifacts|
|---|---|---|---:|---:|---:|---|
|`20260428T081947Z__A1__vanilla__github_copilot-cli_gpt-5-mini__332abac2862d`|ok|github/copilot-cli/gpt-5-mini|1|0|0|complete|
|`20260428T082119Z__A1__with-omc__github_copilot-cli_gpt-5-mini__8ab8bed4229c`|ok|github/copilot-cli/gpt-5-mini|1|0|0|complete|
|`20260428T082223Z__A1-full__vanilla__github_copilot-cli_gpt-5-mini__e7482a3150d5`|ok|github/copilot-cli/gpt-5-mini|1|0|0|complete|

## Refinement decisions

- Scores are saturated, so the next useful refinement is provenance hardening rather than raising existing thresholds blindly.
- Copilot model-backed smoke wrapper defaults to gpt-5-mini so future enhanced benchmark runs match the valid host-account evidence boundary.
- Keep stale/Ollama run dirs as non-authoritative archives only; reports and validators should point to OAuth-backed gpt-5-mini evidence.
- A full same-task gpt-5-mini paired comparison remains a future quality-scoring milestone, not a prerequisite for this bounded wrapper proof.
