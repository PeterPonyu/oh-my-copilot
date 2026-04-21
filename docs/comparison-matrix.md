# Comparison Matrix: OMC, OMX, and oh-my-copilot v1

This matrix compares design lineage, not feature parity.

| Dimension | oh-my-claudecode | oh-my-codex | oh-my-copilot v1 |
| --- | --- | --- | --- |
| Host | Claude Code | OpenAI Codex CLI | GitHub Copilot CLI |
| Primary public promise | Multi-agent orchestration for Claude Code | Workflow layer around Codex CLI | Public research/design corpus for Copilot CLI adaptation |
| V1 status in this repo | Existing implemented reference | Existing implemented reference | Docs/research-first; examples illustrative |
| Main guidance file | `CLAUDE.md`, `AGENTS.md`, plugin/runtime prompts | `AGENTS.md`, prompts, skills, `.omx/` state | `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/` examples |
| Skills | Claude/OMC in-session skills and plugin assets | Codex/OMX workflow skills under `.codex/skills` and repo skills | Copilot CLI skills as `SKILL.md` folders; illustrative only in v1 |
| Role agents | OMC agents and Claude Code team/worker surfaces | Codex native role prompts/subagents and OMX team workers | Copilot CLI built-ins and `.github/agents/*.agent.md` custom agents |
| Hooks | OMC hooks and templates | Native Codex hook integration plus OMX hooks | Copilot CLI `.github/hooks/*.json` examples; no orchestration runtime |
| MCP/integrations | `.mcp.json`, bridge/runtime integrations | MCP servers and connector surfaces | GitHub MCP plus additional MCP servers per Copilot CLI docs |
| Delegation | Team mode, tmux CLI workers, in-session native teams | `$team`, native subagents, tmux/team runtime | Copilot CLI built-in delegation and custom agents; no tmux clone |
| Planning | Deep interview, autopilot, team pipeline | `$deep-interview`, `$ralplan`, `$ralph`, `$team` | Copilot plan mode plus documented workflow recommendations |
| State philosophy | Runtime state, monitoring, session artifacts | `.omx/` plans/state/logs/memory | Rely on Copilot CLI session/context behavior; v1 docs only |
| Verification | Explicit completion and monitoring docs | Verification-first execution protocol | Docs/link/scope checks; future runtime needs new PRD |
| Design rule | Claude Code-native orchestration | Codex-native workflow layer | Copilot-native adaptation; no forced parity |

## Reader guidance

If you are looking for a working runtime, use OMC or OMX in their host contexts.
If you are evaluating what a Copilot-native equivalent should look like, use this
repo as a research map and blueprint.

## Adjacent host note: Cursor

Current first-party Cursor docs now describe CLI use of `AGENTS.md`,
`.cursor/rules`, MCP, hooks, skills, subagents, plugins, and cloud/background
agents. In this repository those Cursor sources are **comparison inputs only**:
they inform sibling `oh-my-cursor` planning and boundary checks, not a fourth
supported host column and not proof that `oh-my-copilot` is validated on
Cursor. See [`docs/references.md`](./references.md) for the current Cursor
source list and access dates.
