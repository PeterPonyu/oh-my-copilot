---
name: ecosystem-compare
description: Compare OMC, OMX, and oh-my-copilot v1 without implying forced feature parity.
---

# Ecosystem Compare Skill

Use this illustrative skill when drafting or reviewing comparison content for `oh-my-claudecode`, `oh-my-codex`, and `oh-my-copilot` v1.

## Workflow

1. Identify the source-system concept being compared.
2. State what is directly evidenced in the source system.
3. Map only to documented Copilot CLI primitives.
4. Mark any design interpretation as inference.
5. Prefer language such as "analogous intent" or "Copilot-native adaptation" over "equivalent" unless exact behavior is documented.

## Required Guardrails

- Keep v1 Copilot CLI-only.
- Do not present OMC/OMX runtime names as required Copilot names.
- Do not claim runtime orchestration exists unless a future implementation plan adds it.
