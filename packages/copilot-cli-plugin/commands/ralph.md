---
name: ralph
description: PRD-driven persistence loop — iterate story-by-story with reviewer verification until done
agent: executor
argument-hint: "[--no-deslop] [--critic=architect|critic|codex] <task description>"
---

# /omcp:ralph

Self-referential loop with mandatory verification. Use when the user wants guaranteed completion ("don't stop", "keep going until done", "must finish") — ralph structures the work into a PRD, picks the highest-priority unfinished story each iteration, and refuses to declare completion until a fresh reviewer pass approves.

**Cost:** up to N iterations × per-iteration agent calls. Bounded by the PRD: stops when all stories show `passes: true` and reviewer approves. Stop early with `/omcp:cancel`.

**Use instead** when:
- Want full pipeline including spec/plan → `/omcp:autopilot`
- Need parallel agents on independent sub-tasks → `/omcp:team`
- Want to review plan before committing → `/omcp:ralplan`

The skill at `skills/ralph/SKILL.md` defines the full procedure. Flag handling:

| Flag | Effect |
|---|---|
| `--no-deslop` | Skip the mandatory post-review deslop cleanup pass |
| `--critic=architect` (default) | Architect agent verifies completion |
| `--critic=critic` | Critic agent verifies completion |
| `--critic=codex` | Codex CLI verifies completion (requires Codex installed) |

State files produced:
- Active PRD: `.omcp/state/sessions/{sessionId}/prd.json` (session-scoped)
- Progress log: `.omcp/state/sessions/{sessionId}/progress.txt`
- Mode tracking: written via `mcp__omcp__state_write(mode="ralph", active=true, iteration=<N>, current_phase="execution")`

The PRD scaffold is auto-generated on first iteration if absent. **Critical:** the LLM must refine generic acceptance criteria ("Implementation is complete") into task-specific ones before proceeding — generic criteria let stories pass without real verification.

Long operations (builds, installs, full test suites) must use `run_in_background: true`. Independent agent calls fire in parallel within the same iteration.

Task: {{ARGUMENTS}}
