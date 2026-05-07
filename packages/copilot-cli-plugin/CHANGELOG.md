# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added (Wave A, PR #18)
- 5 agents ported from OMC: `analyst`, `code-simplifier`, `designer`, `explore`, `git-master`. Agent count 16 → 21.
- 8 skills ported from OMC: `ccg`, `deepinit`, `omc-doctor`, `omc-reference` (since renamed), `omc-setup`, `omc-teams` (since renamed), `wiki`, `writer-memory`. Skill count 35 → 43.

### Changed (Wave B-0, this PR)
- **Skill renames** for namespace coherence inside the `/omcp:` prefix:
  - `omc-teams` → `cli-teams` (body header rewritten to "CLI Teams Skill"; distinguishes process-based tmux workers from the in-Copilot `/omcp:team` skill)
  - `oh-my-copilot-reference` → `reference` (canonical omcp catalog; the duplicate `omc-reference` Wave A port was deleted in favor of this one)
- **`omc-doctor` and `omc-setup` retained as-is.** Body audit confirmed both are genuinely OMC-flavored (diagnose/install OMC alongside omcp), so the `omc-` prefix is honest. They function as cross-host interop skills, not omcp-native ones.
- Cross-references updated in `cancel/SKILL.md`, `omc-doctor/SKILL.md`, and `docs/parity-matrix.md`.
- Translator audit-log artifacts (`.omcp/state/_omc-port-translations.jsonl` written inside each ported skill dir) removed.

### Removed
- `skills/omc-reference/` (duplicate of `oh-my-copilot-reference`, kept the latter).

### Wave-C-1a: Skill path drift sweep (`.omc/` → `.omcp/`)
- Mechanical replacement in 3 skills with paths drifting from the v0.4.0 directory rename: `wiki/SKILL.md` (5 lines), `ccg/SKILL.md` (3 lines), `cli-teams/SKILL.md` (2 lines). 10 lines updated total.
- `writer-memory/SKILL.md` excluded — line 232 references `.omc/notepad.md` as a deliberate cross-host bridge for users running both omcp and OMC. Annotated with `<!-- cross-host: deliberate -->` so future sweeps skip it.
- `cancel/SKILL.md` excluded — owned by Wave-C-1b (separate concern: ToolSearch query-string surgery).

### Wave-C-3: hook augmentation (default-on) + bash↔MCP bridge + fixture tests
- New `omcp_call_store` helper in `.copilot-hooks/common.sh` — bridges from bash hooks to omcp MCP store .mjs functions via `node -e`. Per ADR-2, errors absorbed as exit 0 with stderr warning (`[omcp-bridge] ...`); telemetry must not kill a session. Caller passes JSON args built with `jq -nc` (NOT bash string interpolation) to avoid quoting bugs.
- Augmented `post-tool-audit.sh`: captures stdin envelope; if `exit_code != 0` or `error` field present, writes a `tool_failure` trace event to `.omcp/traces/<session>.jsonl` via `trace_write`. Inserted before parity-guard so traces capture even on parity violations. Best-effort failure detection: works against the partly-observable Copilot CLI envelope shape; tolerates unknown keys.
- Augmented `log-session-start.sh`: queries `state_list_active`; if any modes still active, appends `resumed=true active_modes=...` line to `.copilot-hooks/session.log` so operators can see resumed orchestration state at session start.
- Augmented `session-end-audit.sh`: calls `notepad_prune({maxAgeDays: 7})` before exit so long sessions don't accumulate stale notepad entries.
- New `tests/hook-envelope.fixture.test.mjs`: 7 tests spawn each augmented hook with synthetic envelopes, verify positive (success/failure paths produce expected outputs and side-effects) + negative (unknown envelope keys / malformed JSON / missing module bridge) behavior. Combined suite now 108/108 pass.

### Wave-C-2: tool-ref audit script + wiki skill arg-shape fix
- New `scripts/audit-tool-refs.mjs` parses every `mcp__omcp__<tool>` and `ToolSearch(query="select:...")` reference in `packages/copilot-cli-plugin/skills/**/*.md` and `packages/copilot-cli-plugin/agents/**/*.md`, diffs against `server.mjs` `name:` registrations, and emits 3 lists: (a) referenced-but-not-registered (blocking), (b) registered-but-never-referenced (informational), (c) cross-host allowlist matches.
- New `scripts/audit-tool-refs.allowlist.json` allows `omc-doctor`, `omc-setup`, and `reference` to reference cross-host tool names without failing the audit.
- Audit run: 16 unique tools referenced, 35 registered, list (a) empty (PASS), 23 tools registered-but-unreferenced (Wave-D follow-up scope: skill rewiring to actually invoke the new tools instead of just naming them).
- `skills/wiki/SKILL.md` rewritten — every tool example was using OMC's API (`{title, content, tags, category, page, query}`) instead of omcp's actual schema (`{title, body, tags, slug, q}`). Now uses correct arg names: `body` not `content`, `slug` not `page`, `q` not `query`, `path` for ingest. `category` field replaced with tag-based taxonomy guidance. Examples now use literal `mcp__omcp__` prefix.

### Wave-C-1d: shared-memory 4KB warning + per-family concurrency contract
- `mcp-server/shared-memory-store.mjs`: `sharedMemoryWrite` now computes the encoded byte size of each event before append; if it exceeds 4096 bytes (Linux PIPE_BUF), emits a rate-limited stderr warning. Deduped per `(channel, size)` within a 60-second window via in-memory map. Exposes `_resetSharedMemoryWarningRateLimit()` for test isolation.
- `mcp-server/README.md`: new "Concurrency contract per tool family" section. Per-family rules table covering `state_*`, `notepad_*`, `project_memory_*`, `wiki_*`, `shared_memory_*` with explicit atomicity and concurrent-writer semantics. Aligns documentation with actual implementation per ADR-1.
- `tests/shared-memory-store.test.mjs`: 3 new tests — warning fires on >4KB write, no warning on ≤4KB write, rate limiter dedupes within 60s window. Suite now 101/101 pass.

### Wave-C-1c: scaffold packages/omcs/ stub
- Created `packages/omcs/README.md` reserving the path for the deferred Cursor-IDE-targeted sibling package per ADR-4 of `.omcp/plans/post-wave-b-consolidation.md`. Documents why omcs is monorepo'd-but-empty, host-product differences vs omcp, and when omcs will get real code.
- Added "Sibling package" section to `packages/copilot-cli-plugin/README.md` cross-linking to the new directory.

### Wave-C-1b: cancel/SKILL.md surgery + content reconciliation
- Removed three embedded HTML comments from inside the `ToolSearch(query="...")` call at line 48. The comments claimed `state_clear`, `state_list_active`, `state_get_status` were "not in v1 server" — these claims were false (all three registered in `server.mjs` at L95/L122/L134 since PR #20). The HTML inside the quoted string was runtime garbage being passed to the tool dispatcher.
- Updated 3 stale `.omc/` references in the bash fallback block (walk-up loop, directory check, error message) to `.omcp/` to match the v0.4.0 path rename. The fallback's substantive logic is unchanged — the warning prose about not using fallback for `autopilot`/`cli-teams` remains intact.
- Updated descriptive label "OMC Teams (tmux CLI workers)" to "CLI Teams (tmux CLI workers)" in the dependency-order list to reflect the B-0 skill rename.

## [0.5.0] - 2026-05-06

### Fixed
- **`docs/orchestration.md` rewritten end-to-end.** The previous version listed 6 phantom MCP tools (`read_file`, `write_file`, `run_command`, `list_directory`, `search_files`, `get_diagnostics`) that were never implemented; documented the wrong hook script paths (`hooks/session-start.sh` etc.); used the wrong event name `sessionStop` instead of `sessionEnd`; and showed a `stages` schema that mismatched the array form actually written by `orchestrator.mjs`. The new version reflects the real 8-tool surface, real script paths, real event names, and the array schema.
- **`mcp-server/server.mjs` self-name corrected.** The `Server` constructor identified itself as `"oh-my-copilot"` v0.1.0; updated to `"omcp"` v0.5.0 to match the plugin name and version. (Functionally a no-op — Copilot CLI uses the `.mcp.json` server-key for the tool prefix `mcp__omcp__*` — but eliminates internal naming drift.)
- **`docs/parity-matrix.md`** MCP tools row corrected from `6 / 6` to `6 / 8` to reflect the two pipeline tools added on top of OMC's base surface.

### Removed from installed plugin
- `docs/pipeline-dispatch-contract.md` moved to `tools/omc-port/dispatch-contract.md` (dev-only translator contract; lives next to the translator code).
- `docs/wave-0-decisions.md` moved to `tools/omc-port/historical/wave-0-decisions.md` (port-time historical record; references the original consensus plan that lives in `.omc/plans/`).
- `commands/.keep` placeholder deleted (was a Wave-1 directory reservation; the `commands/` dir is now populated with 5 real slash commands).

### Migration
- Reinstall: `copilot plugin uninstall omcp` then `copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin`. Rebuild MCP runtime deps with `bash mcp-server/build.sh`.

## [0.4.0] - 2026-05-06

### Changed
- **Workspace state path renamed**: `.omc/` -> `.omcp/`. The orchestrator default `stateDir` is now `.omcp/state`; all SKILL.md, agent, doc, and command references updated to write to `.omcp/specs/`, `.omcp/plans/`, `.omcp/state/`, and `.omcp/notepad.md`. Existing `.omc/` workspaces remain readable if you point the orchestrator at the old path explicitly.
- **Payload minimization (round 2)**: 29 `_omc-port-diff.md` files moved from `packages/copilot-cli-plugin/skills/*/` to `tools/omc-port/diffs/<skill>/_omc-port-diff.md`. 2 `TODO_UNRESOLVED.md` markers moved from `skills/git-master/` and `skills/ralph/` to `tools/omc-port/unresolved/<skill>/`. The empty `skills/git-master/` directory was removed.
- `tools/omc-port/payload-audit.sh` now flags both file kinds as DEV-ONLY so future regressions are caught.
- `docs/parity-matrix.md`: skill count corrected from 36 -> 35 (git-master demoted to SKIPPED with v2 marker).

### Migration
- Reinstall: `copilot plugin uninstall omcp` then `copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin`.

## [0.3.0] - 2026-05-06

### Changed
- **BREAKING**: Plugin renamed from `oh-my-copilot-power-pack` to `omcp`. Slash commands and agents are now namespaced as `omcp:<name>` (e.g. `/omcp:deep-interview`, `--agent omcp:planner`).
- **BREAKING**: MCP server name in `.mcp.json` renamed from `oh-my-copilot` to `omcp`. Tools now appear to the model as `mcp__omcp__state_read`, `mcp__omcp__pipeline_record_transition`, etc.
- All in-plugin references updated: SKILL.md instructions, agent prompts, dispatch translator (`tools/omc-port/translate-omc-skill.mjs`), translator test fixtures, plugin docs.

### Migration
- Reinstall: `copilot plugin uninstall oh-my-copilot-power-pack` then `copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin`.
- Pre-existing `.omcp/state/pipeline-state.json` files remain compatible — the file path is unchanged and the schema is identical.

## [0.2.0] - 2026-05-06

### Added
- `commands/` directory reserved for Wave 6 to populate with CLI command definitions.
- `mcpServers` declaration in `plugin.json` pointing to `.mcp.json`.
- `.mcp.json` skeleton declaring the `oh-my-copilot` MCP server entry, pointing to the forthcoming Wave 3 `mcp-server/server.mjs`.

### Notes
- Manifest expansion to support full OMC parity port (per `.omcp/plans/omc-parity-consensus-plan.md`).

## [0.1.0] - earlier

### Added
- Initial plugin shape: 3 agents (`agents/`), 6 skills (`skills/`), and 2 hook events (`hooks.json`).
- Core scaffolding for `omcp` derived from oh-my-copilot.
