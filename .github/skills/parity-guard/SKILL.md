---
name: parity-guard
description: "[OMCP] Scan a repository for parity-risk and over-scope wording."
orchestrates-agents: "reviewer, verifier"
---

# [OMCP] Parity Guard

Use this skill when a repository compares Copilot with OMC or OMX.

## Agent orchestration

This skill coordinates `reviewer` for overclaim detection and `verifier` for
evidence-backed completion checks.

## Run

```bash
./skills/parity-guard/check-parity-claims.sh .
```

## Goal

- prevent claims of full feature parity
- prevent accidental multi-surface expansion wording
- catch misleading runtime-language drift in docs
