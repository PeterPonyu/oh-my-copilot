---
name: review
description: Severity-rated code review pass for pending changes or a specified diff.
user-invocable: true
---

# Review

Use this root workspace skill to run a structured review of code changes before
shipping. Authoring and review must stay in separate passes — if the current
Copilot CLI session wrote the code, hand the review to a different invocation
or a separate session.

## Copilot CLI host note

- Pairs with Copilot CLI's review affordances; the skill itself only structures
  what the reviewer should look for and how to report it.
- Operates on diffs in the current workspace (`git diff`, `git diff --staged`,
  or a file/dir path argument). It does not modify code.

## Run

1. **Collect the diff**:

   ```bash
   git diff --stat
   git diff
   ```

2. **Read the touched files** in full (not just hunks) to catch issues outside
   the immediate diff window.
3. **Evaluate against the rubric below**, severity-rating each finding:
   - **CRITICAL** — broken behavior, security regression, data loss risk.
   - **HIGH** — incorrect logic, missing tests for high-risk paths, breaking
     API change without migration notes.
   - **MEDIUM** — missing edge case, weak validation, fragile assumption.
   - **LOW** — style, naming, docstring polish.
4. **Cite file:line** for every finding and state the smallest fix.
5. **Return a verdict**: APPROVED, REVISE (list of MEDIUM+ to address), or
   REJECT (CRITICAL present).

## Rubric

- Correctness — does the change implement what it claims, including edge cases?
- Tests — do new behaviors have tests; do regressions get covered?
- Security — input validation, secrets, authn/z; defer deep scans to
  `security-review`.
- Readability — naming, structure, dead code, leftover debug statements.
- Boundaries — does the change respect existing module ownership and the
  repo's documented surface boundaries?

## Goal

- give the user concrete, severity-rated feedback they can act on;
- never self-approve in the same pass that authored the code;
- prefer fewer high-signal findings over a long low-signal list;
- escalate to `security-review` when the change touches auth, secrets,
  cryptography, or untrusted input handling.

## Stop conditions

- Stop after returning the verdict; do not edit the code under review.
- Stop and ask the user if the diff is ambiguous (multiple unrelated changes,
  unclear intent) instead of guessing.
