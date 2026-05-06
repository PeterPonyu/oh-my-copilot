# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
- Core scaffolding for `oh-my-copilot-power-pack` derived from oh-my-copilot.
