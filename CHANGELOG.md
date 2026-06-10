# oh-my-copilot Changelog

Root-level changelog for the `oh-my-copilot` repository. Covers repo-wide
changes (docs, known-issues, CI, surface audits). For plugin feature history
see [`packages/copilot-cli-plugin/CHANGELOG.md`](./packages/copilot-cli-plugin/CHANGELOG.md).

## [Unreleased]

### Removed — brand-leakage cleanup

- Removed `omc-setup` skill + command (`packages/copilot-cli-plugin/skills/omc-setup/`,
  `packages/copilot-cli-plugin/commands/omc-setup.md`): these installed/diagnosed
  a separate product (`oh-my-claudecode` under `~/.claude/`), not this plugin.
- Removed `omc-doctor` skill + command (`packages/copilot-cli-plugin/skills/omc-doctor/`,
  `packages/copilot-cli-plugin/commands/omc-doctor.md`) for the same reason.
- Removed `.github` mirrors for both skills and prompts (`omc-setup.prompt.md`,
  `omc-doctor.prompt.md`).
- Updated surface counts: skills 46 → 44, slash commands 45 → 43.
- Updated all dangling references in `setup/SKILL.md`, `hud/SKILL.md`,
  `mcp-setup/SKILL.md`, `reference/SKILL.md`, `docs/quick-start.md`, `README.md`,
  `docs/surface-inventory.json`, and validation scripts.

### Fixed — namespace sweep

- `packages/copilot-cli-plugin/skills/writer-memory/SKILL.md` and its `.github`
  mirror: replaced 19 stray `/oh-my-copilot:writer-memory` slash-command prefixes
  with `/omcp:writer-memory` (completes commit `2b1eaca`'s namespace sweep).
- `packages/copilot-cli-plugin/skills/ccg/SKILL.md` and its `.github` mirror:
  replaced `/oh-my-copilot:ccg` with `/omcp:ccg`.
- `packages/copilot-cli-plugin/skills/cli-teams/SKILL.md`: clarified that
  `@anthropic-ai/claude-code`, `@openai/codex`, and `@google/gemini-cli` are
  **optional external CLI workers**, not dependencies of this plugin.

### Docs — known issues

- Added `docs/known-issues/team-hud-orphan-panes.md`: tracks the open bug where
  team mode degenerates into N stacked HUD panes after the leader pane is
  destroyed. Status: **open / not yet fixed**. Includes root-cause analysis (D1:
  per-turn reconcile never reaps dead-leader HUDs; D2: `chooseTeamLeaderPaneId`
  can elect a HUD pane as leader), suggested fixes, and recovery steps.
  Original forensic capture preserved as `OMX_TEAM_HUD_ORPHAN_ISSUE.md` (untracked)
  in the main checkout.
