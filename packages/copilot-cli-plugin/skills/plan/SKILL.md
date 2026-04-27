---
name: plan
description: Strategic planning workflow that scopes a task before any code is written.
---

# Plan

Use this plugin skill when a Copilot CLI task needs to be scoped before code is
written. Authoring and execution stay in separate passes — this skill never
edits source code itself.

## Modes

- **Interview** (default for vague requests): ask one focused question per
  turn, gathering codebase facts via search/`grep` before asking the user
  about them.
- **Direct** (`--direct`, or request already cites files / functions /
  criteria): skip interview, draft the plan in one pass.
- **Review** (`--review`): critique an existing plan and return APPROVED,
  REVISE, or REJECT.

## Run

1. Classify the request as interview, direct, or review.
2. For interview mode, ask one question at a time targeting the weakest
   dimension; never batch.
3. Draft the plan into `docs/plans/<slug>.md` (or the consuming repo's
   equivalent) with: goal, non-goals, acceptance criteria, implementation
   steps sized to scope, risks, verification commands.
4. Cite file:line where possible; prefer runnable commands over vague intent.

## Goal

- separate planning from execution;
- keep plan artifacts repo-local and discoverable next session;
- defer execution to a follow-up `iterate-loop` or `auto-execute` invocation.
