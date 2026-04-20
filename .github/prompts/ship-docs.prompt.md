---
name: ship-docs
description: Review and verify a root docs or registration change before shipping it.
agent: reviewer
argument-hint: "<doc or registration change>"
---

Review the requested root documentation or Copilot registration change.

Focus on:

- CLI-first, docs/research-first scope boundaries;
- root workspace vs reusable plugin vs example workspace source-of-truth;
- accidental parity or runtime-framework overclaims;
- whether root-relative validation commands are named and runnable;
- whether the verifier handoff should run `./scripts/validate-doc-links.sh`,
  `./scripts/validate-power-surfaces.sh`, or root surface validation.
