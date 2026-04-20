---
name: ship-docs
description: Plan, draft, review, and verify docs changes in this workspace.
agent: planner
argument-hint: "<doc task>"
---

Use the planner -> implementer -> reviewer -> verifier flow to complete the
requested documentation change in this workspace.

Rules:

- keep the result bounded to this workspace;
- prefer edits to docs, prompts, skills, and examples over executable runtime
  code;
- use parity-guard before making OMC/OMX similarity claims;
- finish with a verifier-style check of scope, wording, and file completeness.
