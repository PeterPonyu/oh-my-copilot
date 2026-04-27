---
name: iterate-loop
description: Persistence loop that keeps working a task until acceptance criteria pass and a reviewer signs off.
user-invocable: true
---

# Iterate Loop

Use this root workspace skill when a task must reach a verified, reviewer-signed
endpoint — not just "best effort". It replaces the OMC `ralph` workflow with a
Copilot CLI–native shape: structured PRD, story-by-story execution, fresh
verification, and a separate reviewer pass before declaring done.

## Copilot CLI host note

- Runs sequentially inside the active Copilot CLI session. There is no tmux
  worker or background daemon — the loop is the session itself iterating.
- The "reviewer" pass should happen in a separate Copilot CLI invocation or as
  the final step of the same session with explicit handoff text, so authoring
  and approval do not collapse into the same context.
- Persistent state lives in repo-local files. Default locations:
  - `docs/plans/prd-<slug>.md` — story list with acceptance criteria
  - `docs/plans/progress-<slug>.md` — what was done each iteration

## Run

1. **Initialize the PRD** if missing:
   - Break the task into right-sized stories (each completable in one
     iteration).
   - For every story, write **task-specific** acceptance criteria. Generic
     criteria like "Implementation is complete" are not allowed.
   - Order by priority: foundational stories first.
   - Save to `docs/plans/prd-<slug>.md`.
2. **Pick the highest-priority story whose acceptance criteria are not yet
   passing**. This is the current focus.
3. **Implement the story**. Keep edits scoped; if you discover sub-tasks, add
   them as new stories rather than expanding the current one.
4. **Verify with fresh evidence**:
   - Run the relevant tests, build, lint, and typecheck.
   - Read the actual output. Do not mark a criterion passing on inference.
5. **Mark the story done** only when every acceptance criterion is verified.
   Append a short note to `docs/plans/progress-<slug>.md`.
6. **Loop** until all stories are done.
7. **Reviewer pass** (separate context, or a clearly delimited final pass):
   - Re-check each acceptance criterion against fresh output.
   - Verdict: APPROVED, REVISE, or REJECT.
8. **Cleanup pass** (optional, recommended): scan the changed files for
   leftover debug code, TODOs, dead imports.
9. **Re-verify** after the cleanup pass — tests and build must still pass.

## Goal

- guarantee a verified endpoint, not partial work declared done;
- keep authoring and review in separate passes;
- keep state repo-local so the next session can resume from PRD + progress;
- avoid scope creep: new sub-tasks become new stories, not silent expansions.

## Stop conditions

- Stop and report when a fundamental blocker requires user input (missing
  credentials, ambiguous requirement, external service down).
- Stop when the user says "stop", "cancel", or "abort".
- If the same failure recurs across three iterations, stop and surface it as a
  potential fundamental issue rather than looping further.

## Final checklist

- [ ] Every story in the PRD has acceptance criteria marked passing with
  fresh evidence.
- [ ] No generic boilerplate criteria left ("looks good", "should work").
- [ ] Build, tests, and lint output captured this run (not assumed).
- [ ] Reviewer pass completed in a separate context with an explicit verdict.
- [ ] Progress notes appended to `docs/plans/progress-<slug>.md`.
