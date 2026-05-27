---
name: hyperplan
description: "[OMCP] Adversarial 5-member planning (cross-critique → distill → mandatory planner handoff)"
argument-hint: "<planning request>"
---

# /omcp:hyperplan

Adversarial 5-member planning that runs 3 rounds of cross-critique
(skeptic / validator / researcher / architect / creative), distills only
the defensible insights, and **mandatorily** hands them to the `planner`
agent for executable plan formalization.

Use when planning needs maximum rigor: surface weak assumptions, blind
spots, scope creep, and architectural rot before any code is written.

The skill at `skills/hyperplan/SKILL.md` defines the full 7-phase
procedure. Follow that skill's instructions, using `{{ARGUMENTS}}` as
the user's planning request.

Cost warning: 5 parallel delegations × 3 rounds = up to 15 agent
dispatches. Use `/omcp:plan` for cheaper single-pass planning when
adversarial rigor is not needed.

Task: {{ARGUMENTS}}
