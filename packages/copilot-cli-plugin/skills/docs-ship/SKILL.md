---
name: docs-ship
description: Run repository docs checks and emit explicit evidence before completion.
---

# Docs Ship

Use this skill when a task modifies docs, prompts, instructions, agents, or
example layouts.

## Run

```bash
./skills/docs-ship/run-docs-checks.sh
```

## Goal

- prefer concrete validation output over “looks good”
- run local repo validation if present
- otherwise run parity-guard and basic file checks
