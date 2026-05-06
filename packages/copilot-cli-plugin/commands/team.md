---
name: team
description: N coordinated agents on a shared task list
agent: executor
argument-hint: <n> <task>
---

# /omcp:team

Run N coordinated agents working in parallel on the user's shared task.

The skill at `skills/team/SKILL.md` defines the full procedure. Invoke that skill with the agent count `<n>` and the task description as input.

Distribute sub-tasks across agents, coordinate results, and synthesize a unified output when all agents complete their assigned work.
