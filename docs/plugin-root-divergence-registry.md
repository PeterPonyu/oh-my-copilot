# Plugin vs root divergence registry

This document enumerates the remaining **intentional** differences between the
canonical reusable Copilot CLI plugin package (`packages/copilot-cli-plugin/`)
and the generated **current-directory** root workspace mirror (repository root
`.github/`, `.copilot-hooks/`, `AGENTS.md`).
It implements the governance requirement from
[`plugin-boundary-review.md`](./plugin-boundary-review.md):
plugin Markdown is the source of truth for mirrored assets; divergence is only
allowed where Copilot host discovery or root evidence scripts require it.

Rationale classes:

| Class | Meaning |
| --- | --- |
| **generated mirror** | Root Markdown is regenerated from plugin sources. |
| **repo-specific** | Root carries hooks, CI, and evidence scripts tuned for developing this repository. |
| **routing / packaging** | Host discovers hooks or agents differently for workspace vs installed plugin. |

## Agents (custom agents / “subagents”)

| Role | Root workspace | Plugin package | Rationale class |
| --- | --- | --- | --- |
| all plugin agents | `.github/agents/*.agent.md` | `packages/copilot-cli-plugin/agents/*.agent.md` | generated mirror |

**Invocation difference:** root-local short names vs plugin namespaced routes such as
`omcp:reviewer` (see
[`packages/copilot-cli-plugin/README.md`](../packages/copilot-cli-plugin/README.md)).

## Skills

All root skills under `.github/skills/` are generated from
`packages/copilot-cli-plugin/skills/`.

**Rationale:** reusable plugin skills are the source of truth; root-local skill
drift is blocked by `scripts/check-mirror-drift.sh`.

## Hooks

| Surface | Location | Behavior summary | Rationale class |
| --- | --- | --- | --- |
| Workspace hooks manifest | `.github/hooks/hooks.json` | Runs `bash ./.copilot-hooks/session-start.sh` and `bash ./.copilot-hooks/post-tool-audit.sh` | repo-specific |
| Plugin hooks manifest | `packages/copilot-cli-plugin/hooks.json` | Runs inline command hooks that log under `.copilot-hooks/` with `source=plugin` markers | routing / packaging |
| Root hook scripts | `.copilot-hooks/*.sh` shared helpers | Shell implementations checked into repo root | repo-specific |

Both manifests target the same Copilot hook kinds (`sessionStart`, `postToolUse`)
but **different bash payloads**: workspace favors explicit scripts; plugin favors
self-contained commands suitable for an installed package path.

## Instructions / rules (“rules”)

| Surface | Root workspace | Plugin package |
| --- | --- | --- |
| Repo-wide instructions | `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` | `packages/copilot-cli-plugin/instructions/` |

**Rationale:** Copilot CLI discovers workspace instructions from the **opened
repository**, so this repo mirrors plugin-canonical instruction files into the
root. Installed plugins do not automatically rewrite consumer repository
instructions.

## Prompts and workflows

| Surface | Root workspace | Plugin package |
| --- | --- | --- |
| Prompt files | `.github/prompts/*.prompt.md` | `packages/copilot-cli-plugin/commands/*.md` |
| GitHub Actions workflows | `.github/workflows/*.yml` | Absent |

**Rationale:** prompt templates are generated from plugin command sources for
root development convenience. CI remains root-specific.

## Maintainers

When adding a skill or agent to **both** layers, update this registry if the
intent is shared reuse; if the addition is maintainer-only, keep it root-local and
list it under “Skills present only under the root workspace” on merge.

When preparing a release, attach Copilot CLI hook/session proof under
[`benchmark/results/plugin-session-evidence/`](../benchmark/results/plugin-session-evidence/README.md)
per `docs/release-checklist.md`.
