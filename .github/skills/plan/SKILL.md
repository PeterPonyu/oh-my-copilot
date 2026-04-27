---
name: plan
description: Strategic planning workflow that scopes a task before any code is written.
user-invocable: true
---

# Plan

Use this root workspace skill when a Copilot CLI session needs to scope a vague
or multi-surface task before touching code. Copilot CLI's host-product **plan
mode** is what actually drafts and edits the plan; this skill is a workflow
wrapper that decides whether to interview, draft directly, or ask for review.

## Copilot CLI host note

- The skill is read by the Copilot CLI agent in the current workspace; it does
  not invoke a separate orchestrator.
- Suggested host commands: `copilot plan`, `copilot suggest`, `copilot explain`.
  Verify against your installed Copilot CLI version before quoting them in
  user-facing output.
- Plan artifacts are repo-local. Default location: `docs/plans/<slug>.md`.

## Modes

| Mode | Trigger | Behavior |
| --- | --- | --- |
| Interview | Default for broad or vague requests | Ask one focused question at a time before drafting |
| Direct | `--direct`, or request already cites files / functions / criteria | Skip interview, draft the plan in one pass |
| Review | `--review` | Critique an existing plan file and return APPROVED, REVISE, or REJECT |

## Run

1. Classify the request as interview, direct, or review.
2. Before asking any codebase question, look it up first (Copilot CLI search,
   `grep`, `find`). Only ask the user for preferences, scope, and constraints.
3. Ask one question at a time. Build each question on the previous answer.
4. When ready, draft the plan into `docs/plans/<slug>.md` with:
   - Goal and non-goals
   - Acceptance criteria (testable, file-referenced where possible)
   - Implementation steps (sized to scope, not a fixed template)
   - Risks and mitigations
   - Verification commands
5. In review mode, read the existing plan, evaluate against the same checklist,
   and return a verdict with concrete diff-level feedback.

## Goal

- separate planning from execution so authoring and review stay distinct;
- prefer concrete file/line citations and runnable verification commands over
  vague intent;
- keep the plan repo-local so Copilot CLI can re-discover it next session;
- defer execution to the user or a follow-up `iterate-loop` / `auto-execute`
  invocation; this skill must not edit source code itself.

## Stop conditions

- Stop interviewing once the request is concrete enough to draft.
- Stop the workflow if the user says "just do it" or "skip planning".
- In review mode, stop after returning the verdict; do not patch the plan in
  the same pass.
