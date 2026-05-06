# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.3.0] - 2026-05-06

### Changed
- **BREAKING**: Plugin renamed from `oh-my-copilot-power-pack` to `omcp`. Slash commands and agents are now namespaced as `omcp:<name>` (e.g. `/omcp:deep-interview`, `--agent omcp:planner`).
- **BREAKING**: MCP server name in `.mcp.json` renamed from `oh-my-copilot` to `omcp`. Tools now appear to the model as `mcp__omcp__state_read`, `mcp__omcp__pipeline_record_transition`, etc.
- All in-plugin references updated: SKILL.md instructions, agent prompts, dispatch translator (`tools/omc-port/translate-omc-skill.mjs`), translator test fixtures, plugin docs.

### Migration
- Reinstall: `copilot plugin uninstall oh-my-copilot-power-pack` then `copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin`.
- Pre-existing `.omc/state/pipeline-state.json` files remain compatible — the file path is unchanged and the schema is identical.

## [0.2.0] - 2026-05-06

### Added
- `commands/` directory reserved for Wave 6 to populate with CLI command definitions.
- `mcpServers` declaration in `plugin.json` pointing to `.mcp.json`.
- `.mcp.json` skeleton declaring the `oh-my-copilot` MCP server entry, pointing to the forthcoming Wave 3 `mcp-server/server.mjs`.

### Notes
- Manifest expansion to support full OMC parity port (per `.omc/plans/omc-parity-consensus-plan.md`).

## [0.1.0] - earlier

### Added
- Initial plugin shape: 3 agents (`agents/`), 6 skills (`skills/`), and 2 hook events (`hooks.json`).
- Core scaffolding for `omcp` derived from oh-my-copilot.
