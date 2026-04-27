---
name: deep-interview
description: Socratic ambiguity gating that crystallizes a vague idea into a clear spec before execution.
user-invocable: true
---

# Deep Interview

Use this root workspace skill when the user has a vague idea and you need to
expose hidden assumptions before any code is written. The goal is to refuse to
proceed until ambiguity drops below an explicit threshold.

## Copilot CLI host note

- Runs entirely inside the active Copilot CLI session; no background processes.
- The output is a written spec the user (or a follow-up `plan` / `auto-execute`
  invocation) can act on.
- Spec artifacts are repo-local. Default location: `docs/specs/deep-interview-<slug>.md`.

## Run

1. **Restate the idea** in one sentence and confirm with the user.
2. **Detect greenfield vs brownfield** by listing the working tree (Copilot CLI
   file search, `git status`, `find`). If brownfield, gather codebase facts
   before asking the user about them.
3. **Score four dimensions** after every answer:
   - Goal Clarity (40% greenfield / 35% brownfield)
   - Constraint Clarity (30% / 25%)
   - Success Criteria (30% / 25%)
   - Context Clarity (brownfield only, 15%)
4. **Ask one targeted question per round**, aimed at the lowest-scoring
   dimension. Name the targeted dimension and the score gap before asking.
5. **Report progress** after each round in a small table: dimension, score,
   weighted contribution, gap, plus the resulting ambiguity percentage.
6. **Apply soft challenge modes** if rounds extend:
   - Round 4+: contrarian — "what if the opposite were true?"
   - Round 6+: simplifier — "what is the smallest version that still ships?"
   - Round 8+ (only if ambiguity > 0.3): ontologist — "what IS this, really?"
7. **Stop** when ambiguity ≤ 0.20 (default) or the user explicitly chooses
   early exit. At round 20, hard cap and proceed with a recorded warning.
8. **Write the spec** to `docs/specs/deep-interview-<slug>.md` with goal,
   constraints, non-goals, acceptance criteria, exposed assumptions, and the
   final clarity table.

## Goal

- replace vague intent with a written, testable spec;
- ensure questions target the weakest dimension instead of batching;
- never ask the user about facts the repo can answer;
- keep the spec separate from any execution skill that consumes it.

## Stop conditions

- Ambiguity ≤ threshold: write the spec and stop.
- User says "stop", "enough", or "just build it": save current spec with an
  explicit warning that execution may need rework.
- Repo exploration fails: continue as greenfield and note the limitation.
