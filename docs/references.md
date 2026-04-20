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

- Use references to support Copilot-native adaptation, not forced parity claims
  between Copilot CLI, OMC, and OMX.
- Public Copilot capability claims should cite GitHub documentation or changelog
  material, not community anecdotes.
- Local OMC/OMX statements should cite repository files and label whether they
  are evidence or synthesis.
- Any future runtime claim needs fresh verification in Copilot CLI before being
  promoted from illustrative example to supported behavior.
