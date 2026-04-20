# GitHub Copilot CLI Capability Research

_Last updated: April 20, 2026_

This page summarizes current Copilot CLI primitives relevant to `oh-my-copilot`
v1. See [references](../docs/references.md) for source URLs.

## Evidence-backed capabilities

| Capability | Evidence | v1 design implication |
| --- | --- | --- |
| Terminal-native agent | GitHub's February 25, 2026 changelog calls Copilot CLI terminal-native and GA for Copilot subscribers. | Treat CLI, not cloud/IDE/SDK, as the v1 host. |
| Plan mode | Changelog and docs describe plan mode for analyzing requests and producing an implementation plan before code. | Map OMC/OMX planning workflows to Copilot plan mode plus instructions, not a new planner runtime. |
| Autopilot mode | Changelog says autopilot can work autonomously for trusted tasks. | Document as a Copilot-native autonomy surface; do not wrap it in a custom v1 runtime. |
| Built-in specialized agents | Changelog and CLI docs describe automatic delegation to specialized agents such as Explore, Task, Code Review, and Plan. | Prefer Copilot's delegation model over recreating OMC/OMX worker routing. |
| Custom instructions | Docs cover `.github/copilot-instructions.md`, path-specific `.github/instructions/**/*.instructions.md`, `AGENTS.md`, and local instructions. | Put persistent project policy in instructions; keep long workflow-specific knowledge in skills. |
| Custom agents | Docs describe repository-level `.github/agents`, user-level agents, slash/CLI invocation, and model-driven delegation. | Use custom agents for role-like behavior such as researcher/reviewer rather than tmux workers. |
| Skills | Docs describe `SKILL.md` folders with optional scripts/resources and CLI skill commands. | Use skills for bounded workflows like ecosystem comparison and blueprint checking. |
| Hooks | Docs describe hook JSON under `.github/hooks/` and shell commands at lifecycle moments. | Use hooks for validation/logging examples only; do not turn hooks into runtime orchestration. |
| MCP | Docs describe GitHub MCP availability and adding additional MCP servers. | Treat MCP as an integration channel, not a bespoke tool bridge. |
| Plugins | Docs describe installable bundles containing skills, hooks, agents, and MCP configuration. | Defer plugin packaging until docs and examples prove useful. |
| Review and GitHub operations | CLI docs include examples for reviewing PR changes, creating PRs, managing issues, and using GitHub MCP. | Include review in the mapping, but keep public repo v1 as docs-first. |
| Context/session management | Docs describe steering, queueing follow-up messages, auto-compaction, `/compact`, `/context`, and resume. | Map OMC/OMX memory/state ideas carefully; Copilot has its own session behavior. |

## Inferences and constraints

- **Inference:** Copilot CLI can support an OMC/OMX-inspired workflow through
  instructions, skills, and custom agents, but this does not mean it should copy
  OMC/OMX runtime state machines.
- **Constraint:** GitHub docs are the authority for current Copilot CLI paths and
  behavior. Example files here are illustrative until verified inside Copilot CLI.
- **Constraint:** Cloud agent and IDE behavior can share some files, but v1 docs
  must not imply those surfaces are implemented or comprehensively researched.

## Source-backed file/path primitives

- Repository-wide custom instructions: `.github/copilot-instructions.md`.
- Path-specific instructions: `.github/instructions/**/*.instructions.md` with
  `applyTo` frontmatter.
- Agent instructions: `AGENTS.md` in the repository root/current directory or
  configured instruction directories.
- Repository custom agents: `.github/agents/*.agent.md`.
- Project skills: supported skill directories containing `SKILL.md`.
- Repository hooks: `.github/hooks/*.json` for repository hook definitions.
- Plugin manifests and components: plugin reference lists accepted manifest and
  component paths.
- MCP configuration: CLI/plugin reference and MCP docs describe configuration
  files and interactive `/mcp add` setup paths.

## Verification gap

This research validates documentation claims only. It does not prove that the
example layout in this repo has been executed in a live Copilot CLI session.
