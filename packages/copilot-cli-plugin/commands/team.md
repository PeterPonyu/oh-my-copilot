---
name: team
description: N coordinated agents in parallel via native team primitives — TeamCreate / TaskCreate / SendMessage
agent: executor
argument-hint: "[N:agent-type] [ralph] <task description>"
---

# /omcp:team

Parallel multi-agent execution. Use when the task decomposes into N independent sub-tasks that can run simultaneously (e.g., "fix all TypeScript errors", "redesign all card components", "review architecture from N perspectives").

**Cost:** roughly **N× a single-agent run**, since N teammates execute concurrently. Pick N deliberately: 2-3 for review/critique, 3-5 for parallelizable code work, >5 only when sub-tasks are genuinely independent. Stop with `/omcp:cancel` — handoff files in `.omcp/handoffs/` survive cancellation for resume.

**Use instead** when:
- Sub-tasks have hard sequential dependencies → `/omcp:ralph` (sequential persistence)
- Want full spec→plan→code pipeline → `/omcp:autopilot`
- Want plan-first review before execution → `/omcp:ralplan` then `/omcp:team`

The skill at `skills/team/SKILL.md` defines the full procedure. Argument syntax:

| Form | Effect |
|---|---|
| `<task>` | Auto-size N from decomposition; default agent-type is stage-aware |
| `N:executor <task>` | N teammates spawn as `executor` |
| `N:debugger <task>` | N teammates spawn as `debugger` |
| `N:designer <task>` | N teammates spawn as `designer` |
| `N:codex <task>` | N teammates spawn as Codex CLI workers (requires Codex installed) |
| `N:gemini <task>` | N teammates spawn as Gemini CLI workers (requires Gemini installed) |
| `ralph <task>` | Wrap the team pipeline in Ralph's persistence loop |
| `N:agent-type ralph <task>` | Combine — N parallel teammates inside ralph's verify loop |

Native primitives used by the lead orchestrator:
1. `TeamCreate("<slug>")` — create the team room (lead becomes `team-lead@<slug>`)
2. `TaskCreate × N` — one task per sub-task with dependencies
3. `TaskUpdate × N` — pre-assign owners to teammate names
4. `Task(team_name="<slug>", name="worker-N")` — spawn each teammate
5. `SendMessage` — coordinate, unblock, deliver shutdown
6. `TeamDelete("<slug>")` + `rm .omcp/state/team-state.json` on completion

State tracking via `mcp__omcp__state_write(mode="team", active=true, current_phase="team-plan|team-exec|team-verify|team-fix", agent_count=N)`. Phases recorded transparently so `/omcp:cancel` and resume work correctly. Handoff files between stages live at `.omcp/handoffs/<stage>.md` and are preserved across `TeamDelete`.

**Note:** `state_write` transports values as strings — consumers must coerce `agent_count`/`fix_loop_count` to numbers and `linked_ralph` to boolean when reading.

Task: {{ARGUMENTS}}
