---
name: ralplan
description: "[OMCP] Consensus planning — Planner / Architect / Critic loop until APPROVE, emits plan to .omcp/plans/"
agent: planner
argument-hint: "[--interactive] [--deliberate] [--architect codex] [--critic codex] <task description>"
---

# /omcp:ralplan

Consensus planning gate. Use when the user wants a plan that has survived multi-agent review before any code is written. Runs Planner → Architect → Critic in a loop (max 5 iterations) until Critic returns `APPROVE`. Outputs a finalized plan with ADR and explicit alternatives.

**Cost:** 3 agents per iteration × up to 5 iterations. Read-only pass — no code is modified by ralplan itself. Stop with `/omcp:cancel`.

**Use instead** when:
- Already have a clear scoped task → skip ralplan, go straight to executor or `/omcp:ralph`
- Want execution after planning → ralplan + then `/omcp:autopilot` or `/omcp:team`
- Idea is too vague even for planning → `/omcp:deep-interview` first

The skill at `skills/ralplan/SKILL.md` defines the full procedure. Flag handling:

| Flag | Effect |
|---|---|
| (no flags) | Non-interactive: emits final plan and stops |
| `--interactive` | Adds `AskUserQuestion` gates at draft review and final approval |
| `--deliberate` | Forces deliberate mode: pre-mortem (3 scenarios) + expanded test plan (unit/integration/e2e/observability). Auto-enables for auth/security/migrations/destructive/PII/public-API tasks. |
| `--architect codex` | Architect pass uses Codex CLI (graceful fallback to Claude if unavailable) |
| `--critic codex` | Critic pass uses Codex CLI (graceful fallback to Claude if unavailable) |

Output: `.omcp/plans/<slug>.md` with provenance frontmatter (`produced-by: ralplan`, `produced-at: <ISO-8601>`, `pipeline-stage: plan`). Final plan must include ADR (Decision / Drivers / Alternatives considered / Why chosen / Consequences / Follow-ups).

After writing the plan, the skill calls `mcp__omcp__pipeline_record_transition` with `from: "spec", to: "plan"` so a downstream `/omcp:autopilot` or `/omcp:team` invocation can detect the plan and skip its own planning phase.

**Important:** Architect (step 3) MUST complete before Critic (step 4). Do not fire both in the same parallel batch.

Task: {{ARGUMENTS}}
