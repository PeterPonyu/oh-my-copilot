---
name: autopilot
description: Full autonomous pipeline from spec to working code
agent: executor
argument-hint: <plan-or-goal>
---

# /omcp:autopilot

Run the full autonomous execution pipeline from the user's plan or goal.

The skill at `skills/autopilot/SKILL.md` defines the full procedure. Invoke that skill with the user's plan or goal as input.

Execute explore, plan, implement, and verify phases autonomously. Report completion with evidence when all verification checks pass.
