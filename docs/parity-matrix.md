# OMC ↔ oh-my-copilot Parity Matrix

Tracks per-feature status between `oh-my-claudecode` (OMC) and the
`oh-my-copilot` Copilot CLI plugin.

---

## Summary

| Dimension | OMC total | oh-my-copilot | Coverage |
| --- | --- | --- | --- |
| Skills | 39 | 36 | 92% |
| Agents | 19 | 16 | 84% |
| Slash commands | 5 | 5 | 100% |
| Hook events | 4 | 4 | 100% |
| MCP server tools | 6 | 6 | 100% |

Copilot cloud agent, IDE integrations, and SDK runtimes are structurally out of
scope for the CLI plugin and are not tracked here.

---

## Skills

| OMC skill | Status | oh-my-copilot path | Notes |
| --- | --- | --- | --- |
| ai-slop-cleaner | PORTED | `skills/ai-slop-cleaner/` | Full port |
| ask | PORTED | `skills/ask/` | Full port |
| autopilot | PORTED | `skills/autopilot/` | Full port |
| autoresearch | PORTED | `skills/autoresearch/` | Full port |
| cancel | PORTED | `skills/cancel/` | Full port |
| ccg | SKIPPED | — | Requires Codex + Gemini CLI runtimes; deferred to v2 |
| configure-notifications | PORTED | `skills/configure-notifications/` | Full port |
| debug | PORTED | `skills/debug/` | Full port |
| deep-dive | PORTED | `skills/deep-dive/` | Full port |
| deep-interview | PORTED | `skills/deep-interview/` | Full port |
| deepinit | SKIPPED | — | OMC-specific worktree init; Copilot CLI uses AGENTS.md natively |
| docs-ship | PORTED | `skills/docs-ship/` | Full port |
| external-context | PORTED | `skills/external-context/` | Full port |
| git-master | PORTED | `skills/git-master/` | Full port |
| hud | PORTED | `skills/hud/` | Full port |
| init | SKIPPED | — | Covered by Copilot CLI native AGENTS.md bootstrap |
| iterate-loop | PORTED | `skills/iterate-loop/` | Full port |
| learner | PORTED | `skills/learner/` | Full port |
| mcp-setup | PORTED | `skills/mcp-setup/` | Full port |
| oh-my-copilot-reference | PORTED | `skills/oh-my-copilot-reference/` | Copilot-native equivalent of omc-reference |
| parity-guard | PORTED | `skills/parity-guard/` | Full port |
| plan | PORTED | `skills/plan/` | Full port |
| project-session-manager | PORTED | `skills/project-session-manager/` | Full port |
| ralph | PORTED | `skills/ralph/` | Full port |
| ralplan | PORTED | `skills/ralplan/` | Full port |
| release | PORTED | `skills/release/` | Full port |
| remember | PORTED | `skills/remember/` | Full port |
| review | PORTED | `skills/review/` | Full port |
| sciomc | PORTED | `skills/sciomc/` | Full port |
| self-improve | PORTED | `skills/self-improve/` | Full port |
| setup | PORTED | `skills/setup/` | Full port |
| skill | PORTED | `skills/skill/` | Full port |
| skillify | PORTED | `skills/skillify/` | Full port |
| team | PORTED | `skills/team/` | Full port |
| trace | PORTED | `skills/trace/` | Full port |
| ultraqa | PORTED | `skills/ultraqa/` | Full port |
| ultrawork | PORTED | `skills/ultrawork/` | Full port |
| verify | PORTED | `skills/verify/` | Full port |
| visual-verdict | PORTED | `skills/visual-verdict/` | Full port |

**Skipped (3):** `ccg`, `deepinit`, `init` — all deferred to v2 (see below).

---

## Agents

| OMC agent | Status | oh-my-copilot path | Notes |
| --- | --- | --- | --- |
| architect | PORTED | `agents/architect.agent.md` | Full port |
| code-reviewer | PORTED | `agents/code-reviewer.agent.md` | Full port |
| critic | PORTED | `agents/critic.agent.md` | Full port |
| debugger | PORTED | `agents/debugger.agent.md` | Full port |
| designer | SKIPPED | — | UI/visual focus; no equivalent Copilot CLI surface |
| document-specialist | PORTED | `agents/document-specialist.agent.md` | Full port |
| executor | PORTED | `agents/executor.agent.md` | Full port |
| explorer | DEFERRED | — | Merged into research agent for v1 |
| omc-doctor | SKIPPED | — | OMC-internal diagnostics; no CLI equivalent |
| omc-setup | SKIPPED | — | OMC-internal installer; Copilot CLI uses native plugin install |
| omc-teams | SKIPPED | — | tmux worker runtime; out of scope |
| planner | PORTED | `agents/planner.agent.md` | Full port |
| qa-tester | PORTED | `agents/qa-tester.agent.md` | Full port |
| research | PORTED | `agents/research.agent.md` | Full port |
| reviewer | PORTED | `agents/reviewer.agent.md` | Full port |
| scientist | PORTED | `agents/scientist.agent.md` | Full port |
| security-reviewer | PORTED | `agents/security-reviewer.agent.md` | Full port |
| test-engineer | PORTED | `agents/test-engineer.agent.md` | Full port |
| tracer | PORTED | `agents/tracer.agent.md` | Full port |
| verifier | PORTED | `agents/verifier.agent.md` | Full port |
| writer | PORTED | `agents/writer.agent.md` | Full port |

**Skipped (3):** `designer`, `omc-doctor`, `omc-setup`, `omc-teams` — host-internal or runtime-dependent.
**Deferred (1):** `explorer` — merged into `research` for v1.

Note: OMC agent count is 19 per consensus plan denominator; oh-my-copilot has 16 ported.

---

## Hook events

| OMC hook event | Status | oh-my-copilot implementation | Notes |
| --- | --- | --- | --- |
| sessionStart | PORTED | `hooks/session-start.sh` | Bootstraps config, writes session event |
| preToolUse | PORTED | `hooks/pre-tool-use.sh` | Policy gate via `scripts/policy-patterns.txt` |
| postToolUse | PORTED | `hooks/post-tool-use.sh` | Structured event append to `events.jsonl` |
| sessionStop | PORTED | `hooks/session-stop.sh` | Writes session summary to `session.log` |

All 4 hook events are ported. Log output goes to `.copilot-hooks/` per project
root.

---

## MCP server tools

| Tool | Status | Description |
| --- | --- | --- |
| read_file | PORTED | Read file contents from the project tree |
| write_file | PORTED | Write or overwrite a file |
| run_command | PORTED | Execute a shell command and return output |
| list_directory | PORTED | List directory contents |
| search_files | PORTED | Search files by pattern or content |
| get_diagnostics | PORTED | Return LSP-style diagnostics for a file |
| pipeline_record_transition | PORTED | Record a spec→plan or plan→artifact transition in pipeline-state.json |
| pipeline_state | PORTED | Read the current pipeline state for a slug |

MCP server source: `packages/copilot-cli-plugin/mcp-server/`. Build with
`bash packages/copilot-cli-plugin/mcp-server/build.sh`.

---

## Orchestration

| Feature | Status | Reference | Notes |
| --- | --- | --- | --- |
| Orchestration (spec → plan → artifact pipeline) | PORTED | [`packages/copilot-cli-plugin/docs/orchestration.md`](../packages/copilot-cli-plugin/docs/orchestration.md) | 8-tool MCP surface; 2 pipeline tools (`pipeline_record_transition`, `pipeline_state`); pipeline-state.json schema documented in [state-management.md](../packages/copilot-cli-plugin/docs/state-management.md) |

---

## Slash commands

| OMC command | Status | oh-my-copilot path | Notes |
| --- | --- | --- | --- |
| /autopilot | PORTED | `commands/autopilot.md` | Full port |
| /deep-interview | PORTED | `commands/deep-interview.md` | Full port |
| /ralph | PORTED | `commands/ralph.md` | Full port |
| /ralplan | PORTED | `commands/ralplan.md` | Full port |
| /team | PORTED | `commands/team.md` | Full port |

All 5 slash commands are ported.

---

## v2 follow-ups

The following items are explicitly deferred to v2:

- **wiki_query** — persistent markdown knowledge base; requires a stateful
  storage layer not present in the Copilot CLI plugin model.
- **AST policy gate** — `preToolUse` currently uses regex patterns
  (`scripts/policy-patterns.txt`); a proper AST-aware gate (like OMC's
  `ast_grep`-based policy) is deferred.
- **lspServers** — LSP server enumeration tool; the MCP server currently
  provides `get_diagnostics` but not full server discovery.
- **omc-doctor port** — OMC's self-diagnostic agent; Copilot CLI lacks
  equivalent introspection hooks.
- **omc-setup port** — OMC's guided installer; Copilot CLI uses native plugin
  install commands.
- **omc-teams port** — OMC's tmux worker runtime; structurally out of scope
  for Copilot CLI plugin model.
- **ccg (Claude-Codex-Gemini) port** — requires Codex CLI and Gemini CLI
  runtimes to be available alongside Copilot CLI.
- **deepinit port** — OMC's hierarchical AGENTS.md generator; Copilot CLI
  bootstraps AGENTS.md natively so the value add is lower.
- **designer agent** — UI/visual design agent; no analogous Copilot CLI surface.
- **explorer agent** — merged into `research` agent for v1; may be split in v2.
