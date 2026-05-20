# [OMCP] Plugin source-of-truth orchestration spec

## Goal

Make `packages/copilot-cli-plugin/` the canonical source for Copilot CLI
customization Markdown assets, strengthen the relationship between skills and
custom-agent roles, and add sanity/smoke/E2E validation so the plugin and root
mirror cannot silently drift.

## Constraints

- Preserve the Copilot CLI plugin boundary: the installed plugin owns reusable
  agents, skills, commands, hooks, MCP, and source Markdown. Root `.github/`
  files are a generated current-repository mirror for local development.
- Keep examples illustrative and out of the source-of-truth path.
- Preserve official Copilot CLI naming constraints: plugin, skill, command, and
  agent IDs stay lowercase/kebab-case or existing stable IDs.
- Keep `[OMCP]` visible in descriptions/headings where possible without
  changing routing IDs.
- Do not add external dependencies for validation.

## Non-goals

- Do not invent a separate runtime framework outside Copilot CLI.
- Do not make prompt files proof of Copilot CLI prompt-file support.
- Do not hand-maintain root `.github/agents`, `.github/skills`, or
  `.github/prompts` when a plugin mirror exists.
- Do not publish or push a PR if authentication or remote write access is not
  available.

## Acceptance criteria

- Plugin package contains the canonical instruction Markdown needed to generate
  root `AGENTS.md`, `.github/copilot-instructions.md`, and
  `.github/instructions/*.instructions.md`.
- `scripts/regenerate-github-mirror.sh` mirrors plugin agents, skills, commands,
  and instructions into the root workspace.
- `scripts/check-mirror-drift.sh` fails if root mirrored Markdown diverges from
  plugin canonical sources.
- Main feature skills declare the custom-agent roles they orchestrate.
- A validation script verifies main skill orchestration metadata, command-to-skill
  routing, command `agent:` targets, mirrored instruction sources, and plugin
  inventory sanity.
- CI and release readiness run the new mirror/orchestration checks.
- Existing docs, power-surface, root-surface, release-readiness, MCP tests, and
  smoke paths pass locally where non-interactive execution is possible.
