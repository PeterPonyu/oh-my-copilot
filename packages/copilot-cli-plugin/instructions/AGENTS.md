# [OMCP] oh-my-copilot Agent Instructions

This repository is a Copilot CLI-first research and registration workspace. Work
from the repository root unless a task explicitly targets an example workspace or
the reusable plugin package.

## Scope and boundaries

- Preserve the project boundary: `oh-my-copilot` is a Copilot CLI-native power
  pack; it is not a runtime framework. Copilot cloud agent, IDE integrations,
  and SDK runtimes are out of scope. The plugin currently delivers reusable
  agents, skills, slash commands, hooks, MCP server, and rules/memory policy
  surfaces.
- Treat `packages/copilot-cli-plugin/` as the canonical source for mirrored root
  Copilot Markdown assets: agents, skills, prompts generated from commands, and
  instruction files.
- Treat root `.github/` files and root `AGENTS.md` as generated current-directory
  registration mirrors unless a task explicitly targets root-only validation
  scripts or docs.
- Keep examples illustrative and labelled as examples. Do not use nested example
  behavior as proof of root workspace behavior.
- Do not add dependencies without an explicit plan and verification path.

## Source-of-truth map

| Surface | Canonical owner | Notes |
| --- | --- | --- |
| Root instructions | `packages/copilot-cli-plugin/instructions/` | Mirrored to root `AGENTS.md` and `.github/instructions/`. |
| Agents, skills, commands/prompts | `packages/copilot-cli-plugin/` | Mirrored into root `.github/` by `scripts/regenerate-github-mirror.sh`. |
| Hooks and MCP | `packages/copilot-cli-plugin/` for plugin behavior; root scripts for root evidence | Keep installed-plugin and root evidence distinct. |
| Rules and memory policy | `packages/copilot-cli-plugin/mcp-server/`, `packages/copilot-cli-plugin/instructions/` | Rules are lazy pending context; memory is split across notepad, project memory, wiki, and shared memory. |
| VS Code and CLI examples | `examples/` | Smoke-test and documentation examples, not hidden root dependencies. |
| Docs/research claims | `README.md`, `docs/`, `research/` | Separate evidence from inference and avoid overclaiming. |

## Working rules

- Edit canonical plugin sources first, then run
  `./scripts/regenerate-github-mirror.sh`.
- Do not hand-edit mirrored `.github/agents`, `.github/skills`, or
  `.github/prompts` files except to debug a failed mirror check.
- When editing docs or public copy, preserve CLI-first wording and clearly label
  unsupported behavior as inference, illustrative, or future work.
- When editing docs or public copy, keep claim/proof discipline explicit:
  repository-owned behavior needs repository evidence, Copilot host-product
  capability claims need GitHub sources, and adjacent-host notes stay
  comparison-scoped.
- When editing shell scripts, use `set -euo pipefail`, quote variables, and keep
  commands runnable from the repository root.
- Treat skills as execution protocols, rules as long-lived constraints, and
  memory as classified project knowledge. Do not mix durable facts, temporary
  scratchpad notes, wiki pages, and shared-agent coordination messages into one
  store.

## Verification

Before declaring completion, run the checks that match the changed surface:

```bash
./scripts/check-mirror-drift.sh
node scripts/validate-plugin-orchestration.mjs
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
```

For release or plugin behavior changes, also run release readiness and MCP tests.
