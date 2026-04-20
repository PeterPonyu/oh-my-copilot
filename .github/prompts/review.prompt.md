---
name: review
description: Root alias for reviewing docs, registration, or surface changes before shipping.
agent: reviewer
argument-hint: "<target file, diff, or change description>"
---

Review the requested root workspace change using the root reviewer agent.

This is the short root alias for common review work. Use it when the user wants
the current repository checked without remembering a namespaced plugin agent.

Focus on:

- CLI-first, docs/research-first scope boundaries;
- overclaims about OMC/OMX parity, runtime behavior, or multi-surface support;
- root workspace vs reusable plugin vs illustrative example boundaries;
- prompt `agent:` values and agent handoffs resolving to root-local agents; and
- whether verification should run root-relative docs, power-surface, or
  root-registration checks.

If the user is testing installed reusable plugin behavior instead, call out that
the distinct plugin route remains `oh-my-copilot-power-pack:reviewer`.
