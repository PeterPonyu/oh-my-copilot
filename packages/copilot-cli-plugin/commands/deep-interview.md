---
name: deep-interview
description: Socratic interview to crystallize a vague idea before execution
agent: planner
argument-hint: <vague-idea>
---

# /deep-interview

Run the Socratic deep-interview workflow over the user's idea.

The skill at `skills/deep-interview/SKILL.md` defines the full procedure. Invoke that skill with the user's input as the initial idea.

Iterate Q&A until ambiguity drops below 20%, then write a spec to `.omc/specs/deep-interview-<slug>.md` and offer execution bridge options.
