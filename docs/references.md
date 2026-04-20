# References

Access date for web sources: 2026-04-20.

This page is the citation index for public `oh-my-copilot` v1 claims. It favors GitHub-owned sources for Copilot behavior and uses local research files for source-system synthesis.

## GitHub Copilot CLI

| Source | What it supports in v1 docs | Notes |
| --- | --- | --- |
| [GitHub Copilot CLI is now generally available](https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/) | Copilot CLI as a terminal-native coding agent; plan mode; autopilot mode; built-in specialized agents; background delegation; MCP, plugins, skills, custom agents, hooks; review, diff, undo; repository/session memory. | Changelog source dated 2026-02-25. Use for high-level positioning, not fine-grained file syntax. |
| [About GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli) | Conceptual overview of Copilot CLI and customization surfaces. | Use for broad capability framing. |
| [Using GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-agents/overview) | CLI usage, custom instructions, default/custom agents, delegation, and command-line agent selection. | Use for CLI-first design claims and custom-agent invocation. |
| [Allowing GitHub Copilot CLI to work autonomously](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot) | Autopilot mode, permission implications, `--autopilot`, `--allow-all`/`--yolo`, and continuation limits. | Use carefully: autonomy is a Copilot CLI mode, not an `oh-my-copilot` runtime. |
| [GitHub Copilot CLI now supports Copilot auto model selection](https://github.blog/changelog/2026-04-17-github-copilot-cli-now-supports-copilot-auto-model-selection) | Current model-selection behavior as of 2026-04-17. | Optional current-state reference; not required for v1 examples. |

## Instructions and Guidance Files

| Source | What it supports in v1 docs | Notes |
| --- | --- | --- |
| [Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions) | `.github/copilot-instructions.md`; `.github/instructions/**/*.instructions.md`; `applyTo` frontmatter; `AGENTS.md`; local `$HOME/.copilot/copilot-instructions.md`; `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`. | Primary source for example instruction paths. |
| [agentsmd/agents.md](https://github.com/agentsmd/agents.md) | Cross-agent convention for `AGENTS.md`. | Use only as supporting context; GitHub Docs should remain the primary Copilot source. |

## Skills, Custom Agents, Hooks, MCP, and Plugins

| Source | What it supports in v1 docs | Notes |
| --- | --- | --- |
| [About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) | Skills as folders of instructions, scripts, and resources; project-skill locations such as `.github/skills`; personal-skill locations such as `~/.copilot/skills`; Copilot CLI support. | Use for conceptual skill claims. |
| [Adding agent skills for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) | CLI skill creation and usage; `SKILL.md`; when skills are preferable to broad custom instructions. | Primary source for the example `.github/skills/*/SKILL.md` layout. |
| [About custom agents](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-custom-agents) | Custom agents as agent profiles, repository-level `.github/agents/`, and availability in Copilot CLI. | Use for public explanation. |
| [Creating and using custom agents for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli) | CLI custom agents; `.agent.md`; repository and user locations; manual and explicit invocation. | Primary source for example `.github/agents/*.agent.md`. |
| [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) | YAML frontmatter fields such as `description`, `tools`, `disable-model-invocation`, `user-invocable`, and MCP server configuration; tool aliases. | Use when documenting example agent frontmatter. |
| [Using hooks with GitHub Copilot agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-hooks) | Hook JSON location under `.github/hooks/`, lifecycle triggers including `sessionStart`, `preToolUse`, `postToolUse`, and command hooks. | The page covers Copilot agents broadly and notes CLI loading behavior; keep examples illustrative. |
| [About plugins for GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-plugins) | Plugins as packages that can bundle agents, skills, hooks, MCP servers, and integrations. | Future-extension source; v1 should not claim a shipped plugin. |
| [Comparing GitHub Copilot CLI customization features](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/comparing-cli-features) | Decision guidance for custom instructions, skills, hooks, MCP servers, custom agents, and plugins. | Use for Copilot-native mapping and avoiding forced parity. |
| [GitHub Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/cli-plugin-reference) | Plugin directory conventions and bundle contents, including MCP configuration and custom agent IDs. | Future-extension source. |

## Local Source-System Research

| Source | What it supports in v1 docs | Notes |
| --- | --- | --- |
| `research/omc-analysis.md` | `oh-my-claudecode` concepts, vocabulary, and design-lineage synthesis. | Local research file; distinguish evidence from inference. |
| `research/omx-analysis.md` | `oh-my-codex` concepts, vocabulary, team/runtime boundaries, and design-lineage synthesis. | Local research file; distinguish evidence from inference. |
| [`research/copilot-cli-capabilities.md`](../research/copilot-cli-capabilities.md) | Copilot CLI capability inventory used by the blueprint and mapping docs. | Should be updated whenever Copilot sources change materially. |

## Citation Rules for Contributors

- Cite GitHub Docs or GitHub Changelog before making a public Copilot capability claim.
- Use local source research for OMC/OMX lineage, but do not treat OMC/OMX names as Copilot implementation requirements.
- Mark examples as illustrative unless they have been exercised in Copilot CLI.
- If a source is about cloud agent, IDE, SDK, or plugin behavior rather than CLI behavior, say so before using it in v1 docs.
- Re-check this page when publishing because Copilot CLI documentation is moving quickly.
