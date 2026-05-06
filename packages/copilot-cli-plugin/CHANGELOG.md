# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
