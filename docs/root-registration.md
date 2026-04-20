# Root Copilot Registration

_Current as of April 20, 2026._

This document records how the repository root is being registered as a
first-class Copilot workspace while keeping `oh-my-copilot` deliberately
**Copilot CLI-first**, docs/research-first, and free of OMC/OMX runtime parity
claims.

The root registration work gives the current directory its own discoverable
Copilot surfaces. It does not replace the reusable plugin package, and it does
not make nested examples the source of truth for root behavior.

## Three surfaces, three jobs

| Surface | Primary path | Job | Source-of-truth rule |
| --- | --- | --- | --- |
| Root workspace | repository root and root `.github/` | Current-directory Copilot instructions, root-local agents, prompts, skills, hooks, and docs validation | Canonical for root usage and root prompt routing. |
| Reusable plugin | `packages/copilot-cli-plugin/` | Installed Copilot CLI plugin with namespaced reusable agents, skills, hooks, and scripts | Canonical for reusable plugin agents, skills, hooks, and plugin metadata. |
| Examples | `examples/copilot-cli-layout/` and `examples/vscode-copilot-layout/` | Demonstrations and smoke-test workspaces | Illustrative only; examples must not be treated as root proof. |

## Root registration inventory

| Capability | Root registration | Plugin source | Example source | Boundary |
| --- | --- | --- | --- | --- |
| Instructions | `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` | Plugin skill/agent instructions only | Example workspace instructions | Root instructions govern the current repo; example instructions govern only their workspace roots. |
| Agents | `.github/agents/research.agent.md`, `.github/agents/reviewer.agent.md`, `.github/agents/verifier.agent.md` | `packages/copilot-cli-plugin/agents/*.agent.md` | Example agents, including broader VS Code handoff roles | Root agents are short unnamespaced aliases for current-directory work; plugin agents remain namespaced reusable routes. |
| Prompts | `.github/prompts/*.prompt.md` | None in the plugin package today | Example prompt files | Root prompts are canonical for root slash-command workflows and should target root agents only. |
| Skills | `.github/skills/*/SKILL.md` | `packages/copilot-cli-plugin/skills/*/SKILL.md` | Example skills and scripts | Root skills call root-relative scripts; plugin skills remain installable/reusable. |
| Hooks | `.github/hooks/hooks.json` with `.copilot-hooks/*.sh` helpers | `packages/copilot-cli-plugin/hooks.json` and plugin scripts | Example hook policy and standalone proof script | Root hooks must produce root-workspace evidence; nested example hook behavior is not root proof. |
| Validation | `scripts/validate-doc-links.sh`, `scripts/validate-power-surfaces.sh`, and root-surface validation | Plugin script checks | Example layout checks | Validation must catch missing root files, broken prompt/agent routing, and root/plugin/example drift. |

## Routing rules

- Use root-local names such as `reviewer`, `verifier`, and `research` for
  current-directory work from the repository root.
- Use namespaced plugin routes such as `oh-my-copilot-power-pack:reviewer` when
  explicitly testing or using the installed plugin package.
- Root prompt files should route to root-local agents. They should not depend on
  agents that exist only under `examples/`.
- Root skills should execute from the repository root and call root-relative
  scripts. They should not require changing into `packages/copilot-cli-plugin/`.
- Hook evidence must distinguish root workspace execution from plugin execution,
  for example with `source=root-workspace` and `source=plugin` log lines.

## What counts as proof

Automated proof from the root should include:

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
```

If root-surface checks are folded into `validate-power-surfaces.sh`, the third
command can be omitted, but the same checks still need to pass.

Manual Copilot proof from the root should cover:

1. Copilot reflects root instructions when asked what repository instructions
   are active.
2. Root `reviewer`, `verifier`, and `research` routes are available by short
   name.
3. A namespaced plugin route such as `oh-my-copilot-power-pack:reviewer` remains
   available and semantically distinct from the root alias.
4. Root prompts such as `/review-scope`, `/ship-docs`, and
   `/root-registration-check` route to root agents.
5. Root skills such as `docs-ship` and `parity-guard` use root-relative
   validation commands.
6. A root Copilot session appends root-workspace evidence to
   `.copilot-hooks/session.log` and tool use appends root-workspace evidence to
   `.copilot-hooks/tools.log`.

## Non-goals and guardrails

Root registration does not change the v1 product boundary:

- no custom runtime orchestration machinery;
- no tmux worker runtime;
- no replacement for GitHub Copilot CLI;
- no forced OMC/OMX feature parity;
- no claim that cloud agent, IDE integration, SDK runtime, and CLI should share
  one implementation; and
- no dependence on nested `examples/vscode-copilot-layout/` hook behavior as
  proof of root hook registration.

When root and plugin assets intentionally overlap, prefer thin wrappers or
validated mirrors. If behavior must diverge, document why the divergence is
root-specific instead of silently forking the plugin package.
