# References

_All sources were accessed April 20, 2026 unless noted otherwise._

## GitHub Copilot CLI sources

1. GitHub Changelog, "GitHub Copilot CLI is now generally available" (February
   25, 2026): <https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/>
   - Used for terminal-native positioning, plan mode, autopilot mode,
     specialized agents, background delegation, review/diff/undo, MCP, plugins,
     skills, custom agents, hooks, and session memory claims.
2. GitHub Docs, "About GitHub Copilot CLI":
   <https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli>
   - Used for CLI task examples, steering, automatic context management, and the
     customization feature inventory.
3. GitHub Docs, "Using GitHub Copilot CLI":
   <https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli>
   - Used for plan mode, file context, command execution, custom instructions,
     custom agents, skills, MCP, and session resume behavior.
4. GitHub Docs, "Overview of customizing GitHub Copilot CLI":
   <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/overview>
   - Used for custom instructions, hooks, skills, custom agents, MCP, and plugins.
5. GitHub Docs, "Adding custom instructions for GitHub Copilot CLI":
   <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions>
   - Used for `.github/copilot-instructions.md`, `.github/instructions/**/*.instructions.md`,
     `AGENTS.md`, local instructions, and `COPILOT_CUSTOM_INSTRUCTIONS_DIRS`.
6. GitHub Docs, "Invoking custom agents":
   <https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-agents/invoke-custom-agents>
   - Used for repository-level `.github/agents`, user-level `~/.copilot/agents`,
     CLI agent invocation, skill usage, and MCP server configuration notes.
7. GitHub Docs, "Using hooks with GitHub Copilot CLI":
   <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks>
   - Used for `.github/hooks/*.json` and current-working-directory hook loading.
8. GitHub Docs, "Creating agent skills for GitHub Copilot CLI":
   <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-skills>
   - Used for `SKILL.md` structure and skill activation semantics.
9. GitHub Docs, "Comparing GitHub Copilot CLI customization features":
   <https://docs.github.com/en/copilot/concepts/agents/copilot-cli/comparing-cli-features>
   - Used for choosing between instructions, skills, custom agents, hooks,
     subagents, and plugins.
10. GitHub Docs, "GitHub Copilot CLI plugin reference":
    <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference>
    - Used for plugin manifest paths, plugin component directories, MCP config
      paths, and precedence notes.

## Local source repositories inspected

1. `/home/zeyufu/Desktop/oh-my-claudecode-main`
   - `README.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`,
     `agents/`, `skills/`, `hooks/`, and runtime/source directories.
2. `/home/zeyufu/Desktop/oh-my-codex-main`
   - `README.md`, `AGENTS.md`, `docs/STATE_MODEL.md`, `docs/guidance-schema.md`,
     `docs/hooks-extension.md`, `docs/contracts/`, `prompts/`, `skills/`, and
     runtime/source directories.

## Citation policy

- Public Copilot capability claims should cite GitHub documentation or changelog
  material, not community anecdotes.
- Local OMC/OMX statements should cite repository files and label whether they
  are evidence or synthesis.
- Any future runtime claim needs fresh verification in Copilot CLI before being
  promoted from illustrative example to supported behavior.
