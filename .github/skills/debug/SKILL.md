---
name: debug
description: Root-cause analysis with hypothesis tracking and smallest-fix output.
user-invocable: true
---

# Debug

Use this root workspace skill when the user reports a bug, regression, or
confusing runtime behavior and wants help isolating the real failure signal —
not a broad rewrite.

## Copilot CLI host note

- Runs inside the active Copilot CLI session as a structured analysis pass.
- Pair with `copilot explain` for individual file or symbol questions; this
  skill orchestrates the broader hypothesis loop around it.
- Output is a written diagnosis and the smallest next action; the skill does
  not apply fixes itself unless the user asks.

## Run

1. **Restate the failure** in one sentence: what was observed, what was
   expected, where it was observed.
2. **Gather real evidence first** before guessing:
   - failing test output (`npm test`, `pytest`, etc.)
   - relevant log files
   - recent diff (`git log --oneline -20`, `git diff HEAD~5`)
   - environment details only when they plausibly matter
3. **List 2-3 hypotheses** ordered by prior probability. For each:
   - what evidence would confirm it
   - what evidence would falsify it
   - the cheapest probe to discriminate it from the next-best alternative
4. **Reproduce narrowly** if possible — the smallest command, file, or input
   that triggers the failure.
5. **Distinguish symptom from root cause**. If the failure is in test code,
   ask whether the production code is wrong or the test expectation is wrong.
6. **Propose the smallest next action**: a one-line probe, a one-line fix, or
   a clarifying question to the user. Do not propose broad rewrites before
   isolating the cause.

## Output format

```
Observed failure: <one sentence>
Hypotheses:
  1. <name> — confidence <H/M/L>
     evidence for: ...
     evidence against / gaps: ...
  2. ...
Current best explanation: <one sentence + evidence anchor>
Smallest next action: <one concrete step>
```

## Goal

- prefer real evidence over guesses;
- separate symptom from root cause before recommending a change;
- recommend the smallest verifiable next action;
- escalate to `trace` when the failure is causal/architectural and needs
  competing hypothesis lanes.

## Stop conditions

- Stop after returning the diagnosis and next action; do not patch code unless
  the user asks for the fix in the same turn.
- Stop and ask the user if reproduction requires credentials or services that
  are not available in the workspace.
