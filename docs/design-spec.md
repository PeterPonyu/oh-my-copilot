# oh-my-copilot v1 Design Spec

_Last updated: April 20, 2026_

## Purpose

`oh-my-copilot` documents how an OMC/OMX-style orchestration mindset could be
adapted to GitHub Copilot CLI without pretending Copilot is Claude Code or
Codex. The first public release is a research/design corpus: it explains the
lineage, the current Copilot CLI primitives, and a bounded repository blueprint.

## Binding v1 rule

V1 is **Copilot CLI-first**. Cloud agent, IDE, SDK, and broader Copilot product
surfaces may be mentioned only as future extensions or source context. They are
not implementation targets for v1.

## Audience

- Contributors who know `oh-my-claudecode` or `oh-my-codex` and want to compare
  how the ideas might translate to Copilot.
- Copilot CLI users who want a public map of instructions, agents, skills,
  hooks, MCP, and plugins.
- Future maintainers deciding whether a runtime implementation is justified
  after the research corpus is stable.

## Goals

1. Publish a clear public explanation of what `oh-my-copilot` is and is not.
2. Compare OMC, OMX, and Copilot CLI using evidence-backed language.
3. Map orchestration concepts to Copilot-native customization primitives.
4. Provide a minimal illustrative layout for future Copilot CLI projects.
5. Keep all capability claims tied to current GitHub documentation or changelog
   sources listed in [references](./references.md).

## Non-goals

- No OMC/OMX feature-parity promise.
- No tmux worker runtime or state-machine implementation.
- No custom Copilot CLI wrapper.
- No production plugin package.
- No cloud agent, IDE, or SDK implementation in v1.
- No executable orchestration beyond optional documentation hygiene scripts.

## Why Copilot CLI is the closest v1 analogue

Copilot CLI is the Copilot surface that lives in the terminal and can perform
agentic development tasks in a local repository. GitHub's current docs and
changelog describe CLI support for planning, file edits, command execution,
custom instructions, custom agents, skills, hooks, MCP, plugins, review, and
context management. That makes it closer to the local Claude Code / Codex style
workflow than web-only or editor-only surfaces, even though Copilot's exact
extension model differs.

## Design principles

1. **Adapt to Copilot primitives.** Use Copilot CLI instructions, custom agents,
   skills, hooks, MCP, and plugins before inventing a new runtime layer.
2. **Separate evidence from inference.** Research docs must label what is
   observed in source/docs versus inferred as a design recommendation.
3. **Keep examples illustrative.** Example files demonstrate shape and naming;
   they do not certify end-to-end behavior until tested in Copilot CLI.
4. **Prefer public readability.** V1 should be understandable without installing
   OMC, OMX, or Copilot CLI.
5. **Defer runtime ambition.** If a runtime becomes useful, it needs a later PRD
   with its own verification plan.

## Deliverables

- `README.md`: public landing page and v1 scope.
- `research/omc-analysis.md`: source synthesis from oh-my-claudecode.
- `research/omx-analysis.md`: source synthesis from oh-my-codex.
- `research/copilot-cli-capabilities.md`: source-backed Copilot CLI capability map.
- `docs/comparison-matrix.md`: three-way comparison.
- `docs/copilot-native-mapping.md`: concept-to-primitive mapping.
- `docs/v1-repo-blueprint.md`: target layout and file roles.
- `examples/copilot-cli-layout/`: illustrative Copilot CLI customization layout.
- `scripts/validate-doc-links.sh`: lightweight docs hygiene only.

## Acceptance checklist

- [x] README and this spec state that v1 is Copilot CLI-first.
- [x] Multi-surface expansion is explicitly out of scope for v1.
- [x] Copilot CLI is explained as the closest direct analogue to local terminal
      agent work.
- [x] The mapping recommends Copilot-native adaptation over forced parity.
- [x] The comparison matrix covers OMC, OMX, and oh-my-copilot v1.
- [x] The blueprint provides concrete paths and artifact roles.
- [x] References cite current GitHub documentation and changelog material.
- [x] Research docs separate evidence from inference.
- [x] Example files are bounded as illustrative and avoid runtime parity claims.
