# References

Access date for web sources: 2026-04-21.

This page is the citation index for public `oh-my-copilot` v1 claims. It favors GitHub-owned sources for Copilot behavior and uses local research files for source-system synthesis.

## GitHub Copilot CLI

| Source | What it supports in v1 docs | Notes |
| --- | --- | --- |
| [GitHub Copilot CLI is now generally available](https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/) | Copilot CLI as a terminal-native coding agent; plan mode; autopilot mode; built-in specialized agents; background delegation; MCP, plugins, skills, custom agents, hooks; review, diff, undo; repository/session memory. | Changelog source dated 2026-02-25. Use for high-level positioning, not fine-grained file syntax. |
| [About GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli) | Conceptual overview of Copilot CLI and customization surfaces. | Use for broad capability framing. |
| [Using GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-agents/overview) | CLI usage, custom instructions, default/custom agents, delegation, and command-line agent selection. | Use for CLI-first design claims and custom-agent invocation. |
| [Allowing GitHub Copilot CLI to work autonomously](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot) | Autopilot mode, permission implications, `--autopilot`, `--allow-all`/`--yolo`, and continuation limits. | Use carefully: autonomy is a Copilot CLI mode, not an `oh-my-copilot` runtime. |
| [GitHub Copilot CLI now supports Copilot auto model selection](https://github.blog/changelog/2026-04-17-github-copilot-cli-now-supports-copilot-auto-model-selection) | Current model-selection behavior as of 2026-04-17. | Optional current-state reference; not required for v1 examples. |

## Visual Studio Code Copilot Customization

| Source | What it supports in v1 docs | Notes |
| --- | --- | --- |
| [Use custom instructions in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-instructions) | `.github/copilot-instructions.md`, `AGENTS.md`, and `*.instructions.md` discovery in VS Code. | Primary source for the VS Code example workspace. |
| [Custom agents in VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-agents) | `.agent.md` files, target environments, handoffs, tools, and diagnostics. | Primary source for the planner -> implementer -> reviewer -> verifier chain. |
| [Use Agent Skills in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills) | skill discovery, user-invocable skills, and reusable skill resources. | Use for script-backed VS Code skills. |
| [Use prompt files in VS Code](https://code.visualstudio.com/docs/copilot/customization/prompt-files) | `.prompt.md` files, agent binding, and argument hints. | Use for the `ship-docs` and `review-scope` prompt examples. |
| [Agent hooks in Visual Studio Code](https://code.visualstudio.com/docs/copilot/customization/hooks) | hook file locations, command format, and agent/workspace hook behavior. | Use for workspace hook examples and audit scripts. |
| [GitHub Copilot in VS Code settings reference](https://code.visualstudio.com/docs/copilot/reference/copilot-settings) | relevant settings such as `chat.useAgentsMdFile`. | Use when documenting workspace settings. |

## Instructions and Guidance Files

| Source | What it supports in v1 docs | Notes |
| --- | --- | --- |
| [Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions) | `.github/copilot-instructions.md`; `.github/instructions/**/*.instructions.md`; `applyTo` frontmatter; `AGENTS.md`; local `$HOME/.copilot/copilot-instructions.md`; `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`. | Primary source for example instruction paths. |
| [agentsmd/agents.md](https://github.com/agentsmd/agents.md) | Cross-agent convention for `AGENTS.md`. | Use only as supporting context; GitHub Docs should remain the primary Copilot source. |

## Plugins and Power Surfaces

| Source | What it supports in v1 docs | Notes |
| --- | --- | --- |
| [About plugins for GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/copilot-cli/about-cli-plugins) | plugin bundles for agents, skills, hooks, and MCP. | Use for the local CLI plugin package. |
| [Creating a plugin for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating) | plugin package structure and manifest shape. | Primary source for `packages/copilot-cli-plugin/plugin.json`. |
| [GitHub Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference) | plugin manifest semantics, precedence, and package behavior. | Use for implementation details and naming constraints. |

## Cursor current-state comparison inputs

These sources are for **adjacent-host comparison and sibling `oh-my-cursor`
planning only**. They are not proof that `oh-my-copilot` is installed,
validated, or supported on Cursor today.

| Source | What it supports in local comparison docs | Notes |
| --- | --- | --- |
| [Using Agent in CLI](https://cursor.com/docs/cli/using) | Cursor CLI reads `AGENTS.md` and `CLAUDE.md` at project root, applies them alongside `.cursor/rules`, supports MCP, and exposes file/search/shell/web tools. | Primary source for Cursor CLI host-boundary comparison. |
| [Rules](https://cursor.com/docs/rules) | Project Rules in `.cursor/rules`, Team/User Rules, and `AGENTS.md` as a simpler alternative. | Use for instruction-surface comparison with Copilot, OMC, and OMX. |
| [Model Context Protocol (MCP)](https://cursor.com/docs/mcp) | Cursor MCP support, external-tool/data integration, tool approval, and auto-run behavior. | Use for integration-surface comparison; do not treat as proof for this repo. |
| [Hooks](https://cursor.com/docs/hooks) | Hooks observe, control, and extend the Cursor agent loop with custom scripts. | Use for lifecycle/hook comparison only. |
| [Agent Skills](https://cursor.com/docs/skills) | Cursor skills as reusable `SKILL.md` packages with YAML frontmatter and scripts. | Use for current skill-surface comparison. |
| [Subagents](https://cursor.com/docs/subagents) | Specialized subagents and parallel task execution. | Use for current delegation-surface comparison. |
| [Plugins](https://cursor.com/docs/plugins) | Plugins package rules, skills, agents, commands, MCP servers, and hooks into distributable bundles. | Use for current plugin-bundle claims; keep local wording sibling-scoped. |
| [Cloud Agents](https://cursor.com/docs/cloud-agent) | Remote/background execution surface for Cursor agents. | Use to distinguish Cursor cloud/remote behavior from this repo's Copilot CLI-first proof harness. |
| [Extend Cursor with plugins](https://cursor.com/blog/marketplace) | Official Feb. 17, 2026 product announcement that Cursor plugins bundle MCP servers, skills, subagents, rules, and hooks and can be installed via Cursor Marketplace. | Helpful current-state confirmation for plugin terminology and packaging. |

- Use references to support Copilot-native adaptation, not forced parity claims
  between Copilot CLI, OMC, and OMX.
- Public Copilot capability claims should cite GitHub documentation or changelog
  material, not community anecdotes.
- Local OMC/OMX statements should cite repository files and label whether they
  are evidence or synthesis.
- Cursor citations in this repo should stay explicitly comparison-scoped or
  sibling-planning-scoped unless a future approved plan adds direct Cursor proof.
- Any future runtime claim needs fresh verification in Copilot CLI before being
  promoted from illustrative example to supported behavior.
