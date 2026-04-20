# Copilot-Native Mapping

This mapping intentionally avoids 1:1 feature parity. It asks: "What Copilot CLI
primitive should carry this job?"

| OMC/OMX concept | Copilot CLI-native primitive | Confidence | Notes |
| --- | --- | --- | --- |
| Top-level repo guidance | `AGENTS.md` and `.github/copilot-instructions.md` | High | Copilot CLI docs describe both as instruction sources. |
| Path-specific guidance | `.github/instructions/**/*.instructions.md` | High | Use `applyTo` frontmatter for file globs. |
| Workflow skill | `.github/skills/<name>/SKILL.md` or another supported skill location | Medium | Docs support skills with instructions/resources; exact project path should be verified before publishing as supported. |
| Specialist role prompt | `.github/agents/<role>.agent.md` | High | Repository custom agents are documented. |
| Explore/search lane | Built-in Explore agent or a custom research agent | Medium | Built-ins exist; exact automatic routing is model/tool dependent. |
| Build/test lane | Built-in Task agent plus hooks or skill instructions | Medium | Prefer Copilot's built-in command/test behavior over a new worker runtime. |
| Code review lane | Built-in Code Review agent or custom reviewer agent | High | CLI docs include review examples; changelog lists code review specialization. |
| Plan/PRD gate | Copilot plan mode plus repository instructions | High | Plan mode is documented; PRD artifact naming is a project convention. |
| Autopilot/persistent execution | Copilot autopilot mode | High | Use Copilot's permission/autonomy model; do not wrap it in v1. |
| Team/swarm parallel workers | Built-in delegation/custom agents/background delegation | Medium | Avoid tmux parity; map the user need to Copilot delegation where supported. |
| Hooks | `.github/hooks/*.json` | High | Use for validation/logging examples; avoid lifecycle runtime claims. |
| Tool connectors | MCP server configuration | High | GitHub MCP is built in; other servers can be added per docs. |
| Plugin packaging | Copilot CLI plugin manifest and component dirs | Medium | Future extension only; v1 is not a plugin package. |
| State/memory | Copilot session/context management and Copilot Memory | Medium | Source-backed as available, but not a v1 runtime state model. |
| Documentation verification | Docs scripts and CI workflows | High | Safe v1 scope; not Copilot runtime machinery. |

## Recommended v1 translation pattern

1. Put durable repository policy in `AGENTS.md` and
   `.github/copilot-instructions.md`.
2. Put file-family rules in `.github/instructions/*.instructions.md`.
3. Put specialized, occasionally needed workflows in skills.
4. Put role-specific expertise in custom agents.
5. Use hooks for bounded lifecycle validation.
6. Use MCP for external tools/data.
7. Use plugins only after the component set is stable enough to distribute.

## Explicit anti-mapping

- Do not rename OMC `/team` or OMX `$team` into a Copilot command unless Copilot
  actually provides that command.
- Do not copy `.omx/` or OMC state directories as if Copilot needs them.
- Do not claim custom agents equal tmux workers; they are Copilot subagent
  profiles with their own semantics.
- Do not claim examples are supported product behavior before running them in
  Copilot CLI.
