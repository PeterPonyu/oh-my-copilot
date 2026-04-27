---
name: auto-execute
description: Autonomous execution from idea to verified working code, gating each phase before the next.
user-invocable: true
---

# Auto Execute

Use this root workspace skill when the user wants end-to-end autonomous work
from a brief idea to verified code. This is the Copilot CLI–native adaptation
of the OMC `autopilot` workflow. It composes `deep-interview`, `plan`,
`iterate-loop`, and `review` into a single phased run.

## Copilot CLI host note

- Copilot CLI's host-product **autopilot mode** is what actually executes the
  edits. This skill is the workflow wrapper that decides when to expand,
  plan, implement, test, and review. Verify against your installed Copilot
  CLI version before quoting host-product command names.
- The skill runs phases sequentially in the active session. Each phase must
  finish before the next begins.
- All artifacts are repo-local: `docs/specs/`, `docs/plans/`,
  `docs/plans/progress-<slug>.md`.

## Phases

### Phase 0 — Expansion

- If a deep-interview spec already exists in `docs/specs/`, use it as-is and
  skip to Phase 1.
- If the input is vague (no file paths, function names, or concrete
  acceptance criteria), invoke the `deep-interview` skill first.
- Otherwise, draft a short spec in `docs/specs/auto-execute-<slug>.md` with
  goal, constraints, non-goals, and acceptance criteria.

### Phase 1 — Planning

- Invoke the `plan` skill (direct mode) with the spec.
- Output: `docs/plans/auto-execute-<slug>.md` containing acceptance criteria,
  implementation steps, risks, and verification commands.

### Phase 2 — Execution

- Invoke the `iterate-loop` skill with the plan as the PRD.
- Story-by-story execution with fresh verification after each story.
- Use `parallel-batch` inside iterations when independent work appears.

### Phase 3 — QA cycle

- Run the verification commands listed in the plan.
- Fix failures and re-run, up to a small bounded number of cycles
  (recommend 5).
- If the same failure recurs three times, stop and surface it as a
  fundamental issue.

### Phase 4 — Review

- Invoke the `review` skill in a separate context (do not self-approve).
- For changes touching auth, secrets, cryptography, or untrusted input, also
  invoke `security-review`.
- All reviewers must approve; fix and re-review on rejection.

### Phase 5 — Cleanup

- Remove leftover scaffolding (debug logs, TODO placeholders).
- Re-run verification commands.
- Summarize what was built, where the artifacts live, and any deferred items.

## Goal

- take the user from idea to verified code without manual phase management;
- enforce a separate review pass before declaring done;
- never skip phases silently — if a phase is skipped, say which one and why.

## Stop conditions

- Stop and report when QA cycles exhaust without progress.
- Stop and report when review keeps failing after the bounded retry budget.
- Stop when the user says "stop", "cancel", or "abort".
- If Phase 0 produces an unclear spec, redirect to `deep-interview` rather
  than guessing.
