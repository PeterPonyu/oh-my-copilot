# [OMCP] Copilot CLI official surface audit

_Current as of May 20, 2026._

This note records the remote GitHub documentation check for the root
oh-my-copilot workspace and the reusable
`packages/copilot-cli-plugin/` package. It distinguishes documented Copilot CLI
behavior from repository-maintained convenience surfaces.

## GitHub documentation checked

| Topic | GitHub source | Local implication |
| --- | --- | --- |
| Custom instructions | [Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions) | Root `AGENTS.md`, `.github/copilot-instructions.md`, and `.github/instructions/*.instructions.md` match documented locations. |
| Skills | [Adding agent skills for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) and [About agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) | Root `.github/skills/<name>/SKILL.md` files match the documented project-skill shape; plugin skills also match the plugin component shape. |
| Custom agents | [Creating and using custom agents for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli) and [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) | Root `.github/agents/*.agent.md` files match the documented project-agent shape; plugin agents use documented plugin component paths. |
| Hooks | [Hooks](https://docs.github.com/en/copilot/concepts/agents/hooks) | Root `.github/hooks/hooks.json` uses the documented JSON schema with `version: 1` and hook arrays. |
| Plugins | [About plugins for GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-plugins), [Creating a plugin](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating), and [CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference) | `packages/copilot-cli-plugin/plugin.json` preserves a lowercase plugin `name` and points to documented `agents`, `skills`, and `hooks` component paths. |
| Customization support matrix | [Copilot customization cheat sheet](https://docs.github.com/en/copilot/reference/customization-cheat-sheet) | Prompt files are documented as `.github/prompts/*.prompt.md`, but the matrix does not mark prompt files as Copilot CLI-supported. Treat root prompts as repository-maintained workspace assets, not CLI support proof. |

## Local surface status

| Local surface | Status | Notes |
| --- | --- | --- |
| `AGENTS.md` | Follows documented CLI instruction source behavior | Generated from plugin canonical instruction sources; visible heading uses `[OMCP]`. |
| `.github/copilot-instructions.md` | Follows documented repository-wide instruction location | Generated from plugin canonical instruction sources; visible heading uses `[OMCP]`. |
| `.github/instructions/*.instructions.md` | Follows documented path-specific instruction shape | Existing `applyTo` frontmatter remains stable; generated headings use `[OMCP]`. |
| `.github/agents/*.agent.md` | Follows documented custom-agent profile shape | Mirrored from plugin agents; `name` values stay stable while descriptions and headings use `[OMCP]`. |
| `.github/skills/*/SKILL.md` | Follows documented project-skill shape | Mirrored from plugin skills; skill `name` values stay lowercase and hyphenated while descriptions and headings use `[OMCP]`. |
| `.github/hooks/hooks.json` | Follows documented hook JSON shape | Hook schema fields remain unchanged because the official schema is already clear and machine-oriented. |
| `.github/prompts/*.prompt.md` | Repository-maintained prompt routing surface | Generated from plugin command sources; do not use prompt files as proof of Copilot CLI prompt-file support. |
| `packages/copilot-cli-plugin/plugin.json` | Follows documented plugin manifest shape | Plugin `name` stays kebab-case; description now uses `[OMCP]`. |
| `packages/copilot-cli-plugin/agents/*.agent.md` | Follows documented plugin agent component shape | Agent IDs stay stable; descriptions and headings now use `[OMCP]`. |
| `packages/copilot-cli-plugin/skills/*/SKILL.md` | Follows documented plugin skill component shape | Skill IDs stay stable; descriptions and headings now use `[OMCP]`. |
| `packages/copilot-cli-plugin/hooks.json` | Follows documented plugin hook component shape | Hook schema fields remain unchanged. |

## Prefixing rule

`[OMCP]` is applied only to user-visible labels, descriptions, and Markdown
headings. It is not applied to machine-readable IDs because GitHub documentation
and local validators expect stable lowercase or kebab-case identifiers for
skills, agents, prompts, and plugins.

Stable fields intentionally left unprefixed:

- skill `name` values such as `docs-ship`
- prompt `name` values such as `review`
- agent `name` values such as `reviewer`
- custom agent file names such as `reviewer.agent.md`
- plugin `name` value `omcp`
- hook event names such as `sessionStart` and `postToolUse`

## Result

The local root and reusable plugin surfaces follow the current official Copilot
CLI documentation for instructions, skills, custom agents, hooks, and plugins.
Prompt files remain in the repository as root workspace assets and VS Code-style
prompt templates, but they are not claimed as Copilot CLI-supported prompt-file
commands.
