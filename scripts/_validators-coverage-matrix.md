# Validators Coverage Matrix

Wave 9 — deletion-safe analysis. **No merges or deletions happen here.**
Merges are blocked on this matrix being reviewed and signed off.

Generated: 2026-05-06. Total validator LOC audited: 2441.

---

## Summary table

| Validator | LOC | Uniqueness signature | Coverage overlap | Deletion-safe predicate | Recommendation |
|---|---|---|---|---|---|
| `validate-power-surfaces.sh` | 197 | Asserts VSCode layout file tree + CLI plugin file tree + cross-host benchmark site file tree + `validate_docs_mentions` with Start-here/Reading-path structure. Only validator that runs `validate-cross-host-benchmark-data.py` inline and checks benchmark site presentation primitives. | Some file-presence overlap with `validate-root-copilot-surfaces.sh` (benchmark site files). `validate-release-readiness.sh` calls it as a sub-step. | Cannot be deleted; it is called by `validate-release-readiness.sh` and `bootstrap-copilot-power.sh`. | **KEEP** |
| `smoke-copilot-cli.sh` | 321 | Only script that invokes the live `copilot` CLI binary (`copilot --version`, `copilot plugin --help`, constrained agent prompt smokes, Wave 7 E2E pipeline provenance smoke via `e2e-pipeline-fixture.sh`). No other validator exercises the live CLI binary. | `check-install-state.sh` checks the installed plugin config overlap; `validate-copilot-state-contract.sh` also reads `~/.copilot/config.json`. Those are static checks; only `smoke-copilot-cli.sh` runs live model invocations. | Cannot be deleted; it is the only live CLI exerciser and is called by `validate-release-readiness.sh` and `bootstrap-copilot-power.sh`. | **KEEP** |
| `validate-doc-links.sh` | 518 | Cross-doc Markdown link integrity (internal link resolver), scope-language audit (`CLI-first`, forced-parity rejection), comparison matrix dimension coverage, evidence/inference section checks, external link opt-in. No other validator checks internal Markdown link targets. | `validate-root-copilot-surfaces.sh` checks some boundary doc wording. Scope-language overlap is minor. | Cannot be deleted; it is called by `validate-release-readiness.sh` and `bootstrap-copilot-power.sh`. Internal link checker is unique. | **KEEP** |
| `validate-root-copilot-surfaces.sh` | 520 | Checks root-workspace `.github/` registration surface (instructions frontmatter, agent/prompt wiring via Python AST walk, root skills not routing through example workspaces, root hook execution + log assertions, root boundary docs wording, CI workflow reference). Includes `--self-test` fixture mode. | Root file-presence list partially overlaps `validate-power-surfaces.sh` (benchmark site files, hook files). Hook execution overlap: both scripts touch hook files. CI wiring check (`docs-check.yml`) is unique to this validator. Agent/prompt Python wiring walk is unique. | Can be deleted only if the agent/prompt frontmatter wiring check, root skill canonicality check, hook execution + log assertion, and `validate-root-copilot-surfaces.sh` CI reference are all present in `validate-power-surfaces.sh`. Currently they are not. | **NEEDS_REVIEW** |
| `validate-pages-surface.sh` | 89 | Asserts the `apps/cross-host-benchmark-site` Next.js static-export Pages deployment: `output: 'export'` in `next.config.ts`, `actions/upload-pages-artifact` + `actions/deploy-pages` in `.github/workflows/deploy-pages.yml`, exported HTML content (nav links, `reporting-comparable`, sibling link). Gracefully exits if site is absent. | `validate-power-surfaces.sh` checks the benchmark site source files and presentation primitives. `validate-root-copilot-surfaces.sh` checks `app/page.tsx` comparability wording. The deploy-workflow and exported HTML assertions are unique to this validator. | Can be deleted only if deploy-workflow assertions (`upload-pages-artifact`, `deploy-pages`, `output: export`) and exported-HTML content checks appear in another validator. Currently they do not. | **NEEDS_REVIEW** |
| `validate-copilot-state-contract.sh` | 144 | Asserts runtime plugin installation state: installed plugin `cache_path` is under `~/.copilot/installed-plugins` (not inside the repo), `source.path` points to canonical `packages/copilot-cli-plugin` (not a `.omx/team/` worktree), `.copilot-hooks/config.json` `workspace_root` stays project-local. Exits cleanly when `~/.copilot/config.json` is absent. Delegates to `check-install-state.sh` as a sub-call. | `check-install-state.sh` checks `installedPlugins` presence and plugin surfaces. `validate-copilot-state-contract.sh` adds the cache-path-under-home and no-worktree-path assertions, which are not in `check-install-state.sh`. `smoke-copilot-cli.sh` also reads `~/.copilot/config.json` to detect installed state. | Can be deleted only if the cache-path-under-home assertion and worktree-source-path guard appear in `check-install-state.sh`. Currently they do not (check-install-state validates the source path is canonical, but not the cache path location). | **NEEDS_REVIEW** |
| `validate-release-readiness.sh` | 135 | Orchestrator: asserts `docs/release-checklist.md` content (CLI-first scope, plugin canonical, examples illustrative, versioning, release-notes, smoke, parity-guard mentions), validates plugin `name` and semver `version`, then calls all other validators as sub-steps (`validate-doc-links.sh`, `check-parity-claims.sh`, `validate-power-surfaces.sh`, `validate-root-copilot-surfaces.sh`, `validate-copilot-state-contract.sh`, `validate-benchmark-evidence.sh`, `validate-cross-host-benchmark-data.py`, optionally `smoke-copilot-cli.sh`). The release-checklist content assertions are unique. | Everything else it checks is delegated to sub-validators. The orchestration glue and checklist assertions are unique; all sub-calls are covered by their respective scripts. | Can be merged/deleted only if release-checklist content assertions and plugin semver check move to another script AND all sub-calls are preserved in CI. | **NEEDS_REVIEW** |
| `validate-benchmark-evidence.sh` | 252 | Asserts checked-in benchmark run artifacts: `benchmark/results/current-{quick,full}-{vanilla,enhanced}/` JSON files, all-pass checks with expected counts (4 quick, 7 full), score/threshold in `docs/benchmark-status.md`, `history.jsonl` latest SHA in benchmark-status, wrapper-surface-analysis JSON model provenance, authenticated run evidence. Also calls `validate-cross-host-benchmark-data.py`. All benchmark-run-artifact assertions are unique. | `validate-power-surfaces.sh` calls `validate-cross-host-benchmark-data.py` inline. `validate-release-readiness.sh` calls this script as a sub-step. Benchmark-artifact JSON parsing is unique to this validator. | Can be moved to `apps/cross-host-benchmark-site/scripts/` only if the `benchmark/results/` run-artifact assertions and `docs/benchmark-status.md` sync checks go with it and are still called from CI and `validate-release-readiness.sh`. The script is repo-level (references `docs/` and `benchmark/`), not benchmark-site-specific; moving is risky without careful re-wiring. | **NEEDS_REVIEW** |
| `check-install-state.sh` | 201 | Verifies local installation state: `copilot` CLI binary present, `plugin.json` parses with correct name/version, `~/.copilot/config.json` has `installedPlugins` entry enabled at correct version, `cache_path` directory exists with `agents/`, `skills/`, `hooks.json` surfaces, `source.path` resolves to canonical plugin root (not a worktree). Emits `INSTALL_STATE: ok` sentinel. | `validate-copilot-state-contract.sh` calls this as a sub-step and adds cache-path-under-home and workspace-root checks. `smoke-copilot-cli.sh` checks plugin metadata via Python inline. `bootstrap-copilot-power.sh` calls this as a sub-step. The version-match and cache-surface assertions are unique. | Can be deleted only if every assertion (version match, cache surface check, `INSTALL_STATE: ok` sentinel) moves to `validate-copilot-state-contract.sh`. Currently `validate-copilot-state-contract.sh` depends on this script as a subprocess. | **NEEDS_REVIEW** |
| `prove-vscode-hook-standalone.sh` | 25 | Copies `examples/vscode-copilot-layout` to a temp dir, runs `copilot --allow-all` in it, and asserts `session.log` was created. Only validator that proves live hook execution in an isolated workspace clone (requires live `copilot` CLI). | `validate-root-copilot-surfaces.sh` runs root hook scripts directly (`HOOK_SOURCE=root-workspace`). `smoke-copilot-cli.sh` exercises live CLI. This is the only script that proves hook file creation in a standalone workspace copy. | Can be deleted only if isolated-workspace hook execution proof appears in `smoke-copilot-cli.sh` or `validate-power-surfaces.sh`. Currently it appears in the Wave 7 live path of `smoke-copilot-cli.sh` only when agent smoke is enabled; CI-path does not reproduce it. | **NEEDS_REVIEW** |
| `bootstrap-copilot-power.sh` | 39 | Runs `copilot plugin install`, falls back to `check-install-state.sh` on non-zero exit, then calls `check-install-state.sh`, `validate-copilot-state-contract.sh`, `validate-doc-links.sh`, `validate-power-surfaces.sh`, `validate-root-copilot-surfaces.sh`, `prove-vscode-hook-standalone.sh`. It is an install + full-suite runner, not a validator itself. The `copilot plugin install` invocation is unique. | All assertions are delegated to sub-validators. `smoke-copilot-cli.sh` also calls `copilot plugin install` via `bootstrap` in some flows; but this script is the canonical install entry-point. | Can be simplified to a thin wrapper if `check-install-state.sh` is absorbed elsewhere, but should not be deleted: it is the only script that runs `copilot plugin install`. | **NEEDS_REVIEW** |

---

## Per-validator detail (NEEDS_REVIEW rows)

### `validate-root-copilot-surfaces.sh` (520 LOC)

Validates the root-workspace GitHub Copilot registration surface. Unique assertions:
- Python AST walk of agent/prompt frontmatter (`validate_agent_and_prompt_wiring`): verifies all `.github/agents/*.agent.md` have correct `name` + `description`; all `.github/prompts/*.prompt.md` have `agent:` that resolves to a root-local agent file; no namespaced `org:agent` references in handoffs.
- Root skill canonicality: `docs-ship/SKILL.md` must not route through `examples/vscode-copilot-layout` or `examples/copilot-cli-layout`.
- Hook execution proof: calls `.copilot-hooks/session-start.sh` and `.copilot-hooks/post-tool-audit.sh` live, then checks `.copilot-hooks/session.log` and `.copilot-hooks/tools.log` for `root-workspace` evidence.
- CI wiring: asserts `validate-root-copilot-surfaces.sh` appears in `.github/workflows/docs-check.yml`.
- Includes `--self-test` mode with a full fixture generator.

Overlap with `validate-power-surfaces.sh`: benchmark site file-presence (minor); hook file presence (minor). The agent/prompt wiring walk, skill canonicality, live hook execution + log evidence, and CI-wiring checks are not present in `validate-power-surfaces.sh`.

**Verdict**: High overlap on file-presence checks; unique on wiring. Merge candidate requires moving agent/prompt wiring and hook execution into `validate-power-surfaces.sh` first.

---

### `validate-pages-surface.sh` (89 LOC)

Validates the GitHub Pages deployment surface for `apps/cross-host-benchmark-site`. Unique assertions:
- `next.config.ts` has `output: 'export'` (static export mode required for Pages).
- `.github/workflows/deploy-pages.yml` uses `actions/upload-pages-artifact` and `actions/deploy-pages` and uploads `apps/cross-host-benchmark-site/out`.
- Exported `out/index.html` preserves `oh-my-copilot` heading, nav links (Methodology, History, Benchmark docs, References), sibling `oh-my-cursor` link, and `reporting-comparable` wording.
- Falls back to source-file assertions when `out/index.html` is absent.
- Exits cleanly (bounded) if `apps/cross-host-benchmark-site` dir is absent.

Overlap: `validate-power-surfaces.sh` checks source file presence and `reporting-comparable` in `app/page.tsx`. The deploy-workflow assertions are not duplicated anywhere.

**Verdict**: Small, self-contained, unique on deploy-workflow assertions. KEEP or fold into `validate-power-surfaces.sh` deploy section.

---

### `validate-copilot-state-contract.sh` (144 LOC)

Validates runtime plugin installation state contract. Unique assertions:
- `cache_path` is under `~/.copilot/installed-plugins` (not inside the repo or a team worktree).
- `source.path` points exactly at `packages/copilot-cli-plugin` canonical root.
- `.copilot-hooks/config.json` `workspace_root` matches the repo root (no workspace drift).
- Delegates all surface/file checks to `check-install-state.sh` (sub-call on line 81).
- Exits cleanly when `~/.copilot/config.json` is absent or plugin entry is missing.

Overlap with `check-install-state.sh`: plugin name/version, `installedPlugins` entry. The cache-path-under-home and workspace-root assertions are additive.

**Verdict**: Thin wrapper adding 3 critical state assertions on top of `check-install-state.sh`. Merge candidate: absorb into `check-install-state.sh` as an optional `--check-state-contract` flag.

---

### `validate-release-readiness.sh` (135 LOC)

Release-gate orchestrator. Unique assertions:
- `docs/release-checklist.md` content: CLI-first scope, plugin canonical, examples illustrative, versioning, release notes, smoke reference, parity-guard reference.
- `plugin.json` `name == omcp` and semver-shaped `version`.
- Calls all sub-validators in sequence (doc-links, parity-guard, power-surfaces, root-copilot-surfaces, state-contract, benchmark-evidence, cross-host-data, optional smoke).
- `--skip-copilot-smoke` flag for CI environments without `copilot` CLI.

Overlap: all sub-calls are covered by their respective scripts. The checklist content and plugin semver check are unique to this script.

**Verdict**: Justified orchestrator. Keep if release-checklist assertions remain non-trivial. Could be trimmed if checklist assertions move to `validate-doc-links.sh`.

---

### `validate-benchmark-evidence.sh` (252 LOC)

Validates benchmark run artifacts. Unique assertions:
- `benchmark/results/current-{quick,full}-{vanilla,enhanced}/` JSON artifacts exist and all checks pass (4 quick, 7 full per variant).
- Evaluation `passed` flag and score/threshold in each eval JSON.
- `docs/benchmark-status.md` contains current score snippets and latest `history.jsonl` SHA.
- Wrapper-surface-analysis JSON: model provenance (`gpt-5-mini`), no-Ollama rejection, surface matrix coverage, authenticated run evidence (3 specific run dirs).
- Token presence in `quick-enhanced.smoke_cli.output_tail`, `full-enhanced.install_state.output_tail`, `full-enhanced.standalone_hook_proof.output_tail`.

Overlap: `validate-power-surfaces.sh` calls `validate-cross-host-benchmark-data.py`; `validate-release-readiness.sh` calls this as a sub-step. All benchmark-JSON assertions are unique.

**Verdict**: Scope is repo-level (`benchmark/`, `docs/`), not benchmark-site-specific. Moving to `apps/cross-host-benchmark-site/scripts/` would require re-wiring CI and `validate-release-readiness.sh`. Recommend keeping in `scripts/` for now; re-evaluate if benchmark site becomes a standalone package.

---

### `check-install-state.sh` (201 LOC)

Verifies local installation state. Unique assertions:
- `copilot` CLI binary is in PATH.
- `plugin.json` name is exactly `omcp`.
- `installedPlugins` entry exists, is enabled, version matches manifest.
- `cache_path` directory contains `agents/`, `skills/`, `hooks.json` surfaces.
- `source.path` resolves to canonical plugin root, not a `.omx/team/` or `/worktrees/` path.
- Emits `INSTALL_STATE: ok` sentinel (required by `validate-benchmark-evidence.sh`).

Overlap with `smoke-copilot-cli.sh`: plugin metadata Python check (name, version, keys). Cache-surface and version-match assertions are not in `smoke-copilot-cli.sh`.

**Verdict**: The `INSTALL_STATE: ok` sentinel is depended on by `validate-benchmark-evidence.sh`. Cannot be deleted without moving the sentinel. Merge candidate with `validate-copilot-state-contract.sh`.

---

### `prove-vscode-hook-standalone.sh` (25 LOC)

Proves live hook execution in an isolated workspace. Unique assertion:
- Copies `examples/vscode-copilot-layout` to a temp dir, runs `copilot --allow-all /exit` in it, and asserts `.copilot-hooks/session.log` was created.
- This is the only script that proves hook file creation fires in an isolated workspace (not just that hook scripts are executable).

Overlap with `validate-root-copilot-surfaces.sh`: root hook execution in root workspace. This script exercises the example workspace hook wiring independently.

**Verdict**: Small and unique in scope. Keep as-is. Called by `bootstrap-copilot-power.sh`. Requires live `copilot` CLI.

---

### `bootstrap-copilot-power.sh` (39 LOC)

Install + full-suite runner. Unique action:
- Runs `copilot plugin install packages/copilot-cli-plugin` (the only script that does this).
- Falls back gracefully: if install exits non-zero but `check-install-state.sh` passes, treats it as already-installed.
- Then runs the full local validation suite.

Overlap: all validation sub-calls are covered by their respective validators. The `copilot plugin install` invocation is unique.

**Verdict**: Keep as install entry-point. Not a validator; more accurately a bootstrap runner. Consider moving to `scripts/bootstrap/` in a future cleanup wave.

---

## Recommended action summary

| Validator | Recommendation | Blocked on |
|---|---|---|
| `validate-power-surfaces.sh` | KEEP | — |
| `smoke-copilot-cli.sh` | KEEP | — |
| `validate-doc-links.sh` | KEEP | — |
| `validate-root-copilot-surfaces.sh` | MERGE_INTO_validate-power-surfaces.sh | Coverage matrix sign-off; agent/prompt wiring section must land in target first |
| `validate-pages-surface.sh` | MERGE_INTO_validate-power-surfaces.sh | Coverage matrix sign-off; deploy-workflow section must land in target first |
| `validate-copilot-state-contract.sh` | MERGE_INTO_check-install-state.sh | Coverage matrix sign-off; workspace-root and cache-path assertions must be preserved |
| `validate-release-readiness.sh` | KEEP (trim checklist assertions) | Coverage matrix sign-off |
| `validate-benchmark-evidence.sh` | KEEP in scripts/ (revisit if benchmark site standalone) | Coverage matrix sign-off |
| `check-install-state.sh` | KEEP (absorb state-contract) | Coverage matrix sign-off |
| `prove-vscode-hook-standalone.sh` | KEEP | — |
| `bootstrap-copilot-power.sh` | KEEP (consider move to scripts/bootstrap/) | Coverage matrix sign-off |
