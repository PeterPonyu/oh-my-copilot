# GitHub Copilot CLI Capability Notes

Access date for web sources: 2026-04-20.

This research note grounds the `oh-my-copilot` v1 blueprint and examples in public GitHub sources. It is evidence for a docs-first, Copilot CLI-only research repository; it is not a runtime implementation spec.

## Evidence Summary

| Capability area | Source-backed status | v1 design implication |
| --- | --- | --- |
| Terminal-native agent | GitHub's 2026-02-25 changelog describes Copilot CLI as a terminal-native coding agent and says it can plan, build, review, and remember across terminal sessions. | It is reasonable for v1 to choose Copilot CLI as the closest Copilot analogue to local Claude Code/Codex-style workflows. |
| Plan and autopilot modes | The GA changelog describes plan mode and autopilot mode. The autopilot docs explain that autopilot continues through multiple steps after an initial instruction, subject to permissions and limits. | `oh-my-copilot` can discuss planning/autonomy as Copilot CLI primitives, but should not ship its own autonomous runtime in v1. |
| Built-in specialized agents and delegation | The GA changelog and CLI usage docs describe built-in agents, custom agents, subagent delegation, and parallel/background delegation. | v1 examples can include custom-agent profiles as illustrative specialization points. |
| Repository instructions | GitHub Docs support `.github/copilot-instructions.md`, path-specific `.github/instructions/**/*.instructions.md`, `AGENTS.md`, local instructions, and custom instruction directories. | The example layout should demonstrate these paths and avoid inventing a separate instruction loader. |
| Skills | GitHub Docs describe skills as folders containing `SKILL.md` plus optional resources, with project locations such as `.github/skills`. | v1 examples can include minimal skill folders for repeatable documentation workflows. |
| Custom agents | GitHub Docs describe repository-level `.github/agents/` agent profiles and CLI custom agents with `.agent.md` files. | v1 examples can include `research.agent.md` and `reviewer.agent.md`, labeled illustrative. |
| Hooks | GitHub Docs describe hook JSON files under `.github/hooks/` and lifecycle triggers such as `sessionStart`, `preToolUse`, and `postToolUse`. | v1 can include a conservative hook example as policy/logging illustration, not as product enforcement. |
| MCP and plugins | GitHub sources describe MCP servers and plugins as extension mechanisms; plugins can package skills, agents, hooks, MCP, and other config. | v1 should treat MCP/plugins as future-extension topics unless the plan is amended. |
| Review/diff/undo | The GA changelog describes `/diff`, `/review`, and rewind behavior. | Public docs can mention review/diff as Copilot CLI primitives, but examples should not depend on them. |
| Memory | The GA changelog describes session compaction, repository memory, and cross-session memory. | v1 may mention memory as a Copilot CLI capability, but should not design a separate memory subsystem. |

## Evidence Details

### Copilot CLI is a valid v1 host

GitHub's February 25, 2026 changelog positions Copilot CLI as a terminal-native coding agent and says it evolved from a terminal assistant into an agentic development environment that can plan, build, review, and remember. This supports the v1 decision to focus on Copilot CLI rather than cloud agent, IDE, SDK, or multi-surface behavior.

**Inference:** Copilot CLI is the closest direct Copilot host for local terminal workflows analogous in intent to Claude Code or Codex. This is an interpretation, not a claim that Copilot CLI matches either source system feature-for-feature.

### Planning and autonomy are Copilot CLI primitives

The GA changelog identifies plan mode and autopilot mode. The autopilot concept page adds operational constraints: autopilot is best for clear tasks, can require broad permissions for best results, and should be bounded with continuation limits in unattended/programmatic contexts.

**V1 wording guidance:** Say that Copilot CLI provides plan/autopilot surfaces. Do not say that `oh-my-copilot` implements its own `ralph`, `team`, `ultrawork`, or orchestration runtime in v1.

### Instructions should use documented Copilot paths

The custom-instructions docs support repository-wide `.github/copilot-instructions.md`, path-specific `.github/instructions/**/*.instructions.md` with `applyTo`, `AGENTS.md`, local `$HOME/.copilot/copilot-instructions.md`, and `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`.

**V1 wording guidance:** The example layout should use these paths directly. Do not invent a compatibility layer that loads OMC/OMX instruction files.

### Skills are narrower than always-on instructions

GitHub Docs describe skills as task-specific folders of instructions/scripts/resources and recommend custom instructions for guidance that should apply broadly. This supports a split between `.github/copilot-instructions.md` for always-on repository behavior and `.github/skills/*/SKILL.md` for repeatable workflows.

**V1 wording guidance:** Skills in the example layout should stay small and task-specific, such as comparing ecosystems or checking the blueprint boundary.

### Custom agents are specialization surfaces

GitHub Docs describe custom agents as specialized Copilot profiles. CLI docs say custom agents can be created in `.github/agents/` or `~/.copilot/agents/`, and the configuration reference lists frontmatter fields and tool aliases.

**V1 wording guidance:** Example custom agents may show a research role and reviewer role, but should avoid hardcoded model claims or heavy tool assumptions. Keep them illustrative until tested in Copilot CLI.

### Hooks, MCP, and plugins are extension points, not v1 runtime

Hooks can execute shell commands at lifecycle events. MCP servers and plugins can extend the CLI with additional tools and packaged configuration. These are strong future-extension primitives, but they can easily look like a runtime framework if overused.

**V1 wording guidance:** Include only a conservative hook example under `examples/`. Treat MCP and plugins as documented future paths; do not ship plugin manifests or MCP server configs in v1 unless the approved plan changes.

## Mapping Guardrails

- Use "Copilot-native adaptation" instead of "equivalent" for most OMC/OMX mappings.
- Use "illustrative" for example files that have not been run in a real Copilot CLI session.
- Use "future extension" for cloud agent, IDE, SDK, plugin marketplace, and MCP-server packaging topics.
- Avoid implying that OMC/OMX runtime terms such as `ralph`, `team`, or `ultrawork` are required names or modes in Copilot CLI.

## Source Index

See [`docs/references.md`](../docs/references.md) for the canonical citation table.
