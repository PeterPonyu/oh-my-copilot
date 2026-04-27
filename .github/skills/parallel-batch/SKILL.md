---
name: parallel-batch
description: Decompose a task into independent steps and run them in the right order with the lightest viable approach.
user-invocable: true
---

# Parallel Batch

Use this root workspace skill when a task has multiple independent pieces that
should not be serialized unnecessarily. This is the Copilot CLI–native
adaptation of the OMC `ultrawork` engine: Copilot CLI is single-pane, so true
multi-agent parallelism is not available, but background shell execution and
tight sequential batches still cut total wall time meaningfully.

## Copilot CLI host note

- Copilot CLI is a single-pane session; "spawn N workers" is not a primitive
  here. Do not pretend otherwise.
- Real parallelism comes from:
  - running long shell operations in the background (installs, builds, test
    suites) while continuing other work in the foreground;
  - issuing multiple `copilot suggest` or `copilot explain` calls back-to-back
    without waiting on intermediate explanation;
  - batching independent file edits in the same turn.
- For multi-process orchestration the user should reach for their own shell or
  CI; this skill does not invent a host-side worker pool.

## Run

1. **List the work items** the user has in mind, one bullet per item. Keep
   each item to a single, concrete deliverable.
2. **Mark dependencies** between items — what must finish before what.
3. **Classify each item by effort tier**:
   - **Light** — small read or edit, <30 s of model time. Inline.
   - **Standard** — file or module change with quick verification. Inline.
   - **Heavy** — install, full build, full test suite. Run in background.
4. **Schedule**:
   - Fire all independent **Heavy** items in the background first (`&`,
     `nohup`, or your shell's job control), then proceed with **Light** /
     **Standard** items in the foreground.
   - Group independent Standard items into one turn so the model emits all
     edits together rather than waiting on each.
   - Run dependent items only after their prerequisites complete.
5. **Verify after each batch**:
   - Build / typecheck passes.
   - Affected tests pass.
   - No new lint or diagnostics errors.

## Goal

- cut wall time on tasks with independent steps without inventing a worker
  runtime Copilot CLI does not have;
- keep dependencies explicit so nothing is parallelized that should not be;
- prefer background execution for long shell commands rather than blocking on
  them.

## Stop conditions

- Stop after the final batch verification passes.
- Stop if a dependency graph reveals there is no actual parallelism — at that
  point recommend the user invoke `iterate-loop` or just do the work
  sequentially.
- If a background job fails, surface it before continuing further batches.
