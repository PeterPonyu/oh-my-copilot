# [OMCP] Copilot surface audit PRD

## Story 1: Official documentation audit

Acceptance criteria:

- Root custom instructions, path instructions, custom agents, skills, hooks, and
  plugin metadata are compared with GitHub Copilot CLI documentation.
- Prompt files are explicitly separated from Copilot CLI proof if the support
  matrix does not mark them as CLI-supported.

## Story 2: Visible `[OMCP]` asset prefix

Acceptance criteria:

- Root `AGENTS.md`, `.github/copilot-instructions.md`,
  `.github/instructions/*.instructions.md`, `.github/agents/*.agent.md`,
  `.github/prompts/*.prompt.md`, and `.github/skills/*/SKILL.md` have visible
  `[OMCP]` labels in headings and/or descriptions.
- Reusable plugin README, plugin description, agents, and skills have visible
  `[OMCP]` labels in headings and/or descriptions.
- Stable machine-readable IDs remain unchanged.

## Story 3: Documentation and validation

Acceptance criteria:

- `docs/copilot-cli-official-surface-audit.md` records the official-docs
  comparison and prefixing rule.
- Existing docs and Copilot surface validators pass.
- A separate review pass approves the changes or all material findings are
  addressed.
