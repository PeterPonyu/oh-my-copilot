---
name: ralph
description: Persistence loop with verification until task completion
agent: executor
argument-hint: <task>
---

# /ralph

Run the persistence loop workflow until the user's task is fully complete.

The skill at `skills/ralph/SKILL.md` defines the full procedure. Invoke that skill with the user's task as input.

Iterate implement-verify cycles, self-correcting on failure, until all verification checks pass. Stop only on confirmed completion or explicit user cancellation.
