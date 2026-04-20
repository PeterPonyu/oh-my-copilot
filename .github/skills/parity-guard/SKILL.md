---
name: parity-guard
description: Scan the root repository for parity-risk or over-scope wording.
user-invocable: true
---

# Parity Guard

Use this root workspace skill before publishing explanations that compare
Copilot with OMC or OMX, or before shipping root registration copy.

## Run

```bash
./packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh .
```

## Goal

- prevent positive claims of full feature parity;
- prevent language that implies this repository is an OMC/OMX runtime clone;
- keep examples labelled as examples and plugin behavior labelled as reusable
  plugin behavior;
- fix wording before publishing or summarizing the change.
