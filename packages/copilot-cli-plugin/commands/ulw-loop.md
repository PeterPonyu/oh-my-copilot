---
name: ulw-loop
description: "[OMCP] Ultrawork loop with Oracle verification — parallel routing + mandatory verifier gate"
argument-hint: "[--max-iterations=N] [--strategy=reset|continue] <task description>"
---

# /omcp:ulw-loop

Ultrawork parallel routing with a **mandatory Oracle verification gate**.
The loop does not end on the executor's word; it ends only when the
`verifier` agent (Oracle) confirms completion against actual repository
state.

Default max iterations: **500**. Default strategy: `continue` (feed
rejection back to the same executor session).

The skill at `skills/ulw-loop/SKILL.md` defines the full execution
contract — completion promise, Oracle dispatch payload, strategy
branching, state persistence, hard stop on iteration limit.

Cost warning: each iteration runs parallel agents PLUS a verifier
dispatch. Use `/omcp:ultrawork` for cheaper fire-and-forget parallel
execution when verified completion is not required.

Cancel anytime via `/omcp:cancel`.

Task: {{ARGUMENTS}}
