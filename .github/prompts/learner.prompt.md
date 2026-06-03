---
name: learner
description: "[OMCP] Extract a learned skill from the current conversation and persist it as a reusable artifact"
argument-hint: "[topic or focus area; defaults to 'main thread of this conversation']"
---

# /omcp:learner

Capture an emergent skill, pattern, or workflow from this conversation as a reusable artifact in `.omcp/skills/omc-learned/<slug>/SKILL.md`. Use this when:
- We just discovered a non-obvious approach worth keeping
- A multi-step debugging method paid off
- A repeatable interview/analysis pattern emerged

The skill at `skills/learner/SKILL.md` defines the full procedure:

1. Identify the candidate skill from `{{ARGUMENTS}}` (or infer from recent session activity).
2. Extract the procedure: trigger condition, steps, success criteria, failure modes.
3. Write a SKILL.md draft with proper frontmatter (name, description, level, triggers).
4. Save to `.omcp/skills/omc-learned/<slug>/SKILL.md` (project-local) — promote to `${COPILOT_CONFIG_DIR:-~/.copilot}/skills/omc-learned/` only if the user explicitly asks (rare; for truly portable insights).

Don't auto-promote. Don't compress aggressively. The point is to preserve the *why* and *when*, not just the *how*.

Topic: {{ARGUMENTS}}
