---
name: autopilot
description: Full autonomous pipeline — spec → plan → implement → QA → validate, end-to-end
agent: executor
argument-hint: "<idea or task description>"
---

# /omcp:autopilot

Autonomous end-to-end execution. Use when the user wants hands-off "build me X" delivery — autopilot runs Phase 0 (spec) → Phase 1 (plan) → Phase 2 (parallel implement) → Phase 3 (QA loop) → Phase 4 (multi-perspective validation) without intervention.

**Cost:** runs many agent calls across phases — same order of magnitude as `/omcp:team` but sequenced over time. Stop with `/omcp:cancel` at any point; in-progress artifacts are preserved.

**Use instead** when:
- Single change with a clear file/function target → executor agent or `/omcp:ralph`
- Vague idea, want clarification first → `/omcp:deep-interview`
- Want to review a plan before execution → `/omcp:ralplan`

The skill at `skills/autopilot/SKILL.md` defines the full procedure. Pipeline-aware fast paths:

| Detected upstream artifact | Behavior |
|---|---|
| `.omcp/plans/ralplan-*.md` or `.omcp/plans/consensus-*.md` exists | Skip Phase 0 + Phase 1, jump to Phase 2 (Execution) |
| `.omcp/specs/deep-interview-*.md` exists | Skip Phase 0 expansion, use spec as Phase 0 output |
| Input is vague (no file paths or symbols) | Offer redirect to `/omcp:deep-interview` first |
| Otherwise | Run full Phase 0 → 4 |

Output paths produced:
- Phase 0 spec: `.omcp/autopilot/spec.md`
- Phase 1 plan: `.omcp/plans/autopilot-impl.md`
- Phase 2 code: directly in the working tree
- Phase 4 validation report: `.omcp/artifacts/autopilot-validation-<slug>.md`

After writing the final implementation artifact, the skill calls `mcp__omcp__pipeline_record_transition` with `from: "plan", to: "artifact"` to chain into `.omcp/state/pipeline-state.json`.

Mode tracking via `mcp__omcp__state_write(mode="autopilot", active=true, current_phase="<phase>")` so `/omcp:cancel` can clear it.

Goal: {{ARGUMENTS}}
