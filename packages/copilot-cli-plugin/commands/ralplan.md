---
name: ralplan
description: Consensus planning with Planner+Architect+Critic loop
agent: planner
argument-hint: "[--deliberate] <goal>"
---

# /ralplan

Run the consensus planning workflow over the user's goal.

The skill at `skills/ralplan/SKILL.md` defines the full procedure. Invoke that skill with the user's goal (and optional `--deliberate` flag) as input.

Cycle through Planner, Architect, and Critic roles until consensus is reached, then emit a finalized plan to `.omcp/plans/<slug>.md` and offer execution handoff.
