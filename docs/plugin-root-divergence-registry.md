# Plugin vs root divergence registry

This document enumerates **intentional** differences between the reusable Copilot
CLI plugin package (`packages/copilot-cli-plugin/`) and the **current-directory**
root workspace (repository root `.github/`, `.copilot-hooks/`, `AGENTS.md`).
It implements the governance requirement from
[`plugin-boundary-review.md`](./plugin-boundary-review.md):
same conceptual roles may appear in both layers, but **byte parity is not a goal**.

Rationale classes:

| Class | Meaning |
| --- | --- |
| **generalization** | Plugin keeps reusable wording and avoids oh-my-copilot maintainer-only workflows. |
| **repo-specific** | Root carries prompts, skills, and instructions tuned for developing this repository. |
| **routing / packaging** | Host discovers hooks or agents differently for workspace vs installed plugin. |

## Agents (custom agents / “subagents”)

| Role | Root workspace | Plugin package | Rationale class |
| --- | --- | --- | --- |
| research | `.github/agents/research.agent.md` | `packages/copilot-cli-plugin/agents/research.agent.md` | generalization / repo-specific |
| reviewer | `.github/agents/reviewer.agent.md` | `packages/copilot-cli-plugin/agents/reviewer.agent.md` | generalization / repo-specific |
| verifier | `.github/agents/verifier.agent.md` | `packages/copilot-cli-plugin/agents/verifier.agent.md` | generalization / repo-specific |

**Invocation difference:** root-local short names vs plugin namespaced routes such as
`oh-my-copilot-power-pack:reviewer` (see
[`packages/copilot-cli-plugin/README.md`](../packages/copilot-cli-plugin/README.md)).

## Skills

Skills present **only under the root workspace** (not shipped in the plugin package):

| Skill directory | Notes |
| --- | --- |
| `.github/skills/auto-execute/` | Maintainer workflow |
| `.github/skills/deep-interview/` | OMC-oriented workflow in this repo |
| `.github/skills/doctor/` | Install/diagnostic lane |
| `.github/skills/parallel-batch/` | Batch workflow |
| `.github/skills/root-surface-audit/` | Validator-oriented audit |
| `.github/skills/security-review/` | Security lane |
| `.github/skills/trace/` | Trace workflow |

Skills present in **both** layers (names aligned; bodies may drift):

| Skill | Root | Plugin |
| --- | --- | --- |
| debug | `.github/skills/debug/` | `packages/copilot-cli-plugin/skills/debug/` |
| docs-ship | `.github/skills/docs-ship/` | `packages/copilot-cli-plugin/skills/docs-ship/` |
| iterate-loop | `.github/skills/iterate-loop/` | `packages/copilot-cli-plugin/skills/iterate-loop/` |
| parity-guard | `.github/skills/parity-guard/` | `packages/copilot-cli-plugin/skills/parity-guard/` |
| plan | `.github/skills/plan/` | `packages/copilot-cli-plugin/skills/plan/` |
| review | `.github/skills/review/` | `packages/copilot-cli-plugin/skills/review/` |

**Rationale:** repo-specific skills stay workspace-local; reusable bundles ship with the plugin.

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
| Repo-wide instructions | `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` | Not bundled inside `packages/copilot-cli-plugin/` |

**Rationale:** Copilot CLI discovers workspace instructions from the **opened
repository**. The plugin supplies agents, skills, and hooks—not a replacement
for checking in `.github/` instructions on consumer repos unless maintainers copy them.

## Prompts and workflows

| Surface | Root workspace | Plugin package |
| --- | --- | --- |
| Prompt files | `.github/prompts/*.prompt.md` | Absent |
| GitHub Actions workflows | `.github/workflows/*.yml` | Absent |

**Rationale:** prompts and CI are repository maintenance concerns, not Copilot CLI plugin payloads.

## Maintainers

When adding a skill or agent to **both** layers, update this registry if the
intent is shared reuse; if the addition is maintainer-only, keep it root-local and
list it under “Skills present only under the root workspace” on merge.

When preparing a release, attach Copilot CLI hook/session proof under
[`benchmark/results/plugin-session-evidence/`](../benchmark/results/plugin-session-evidence/README.md)
per `docs/release-checklist.md`.
