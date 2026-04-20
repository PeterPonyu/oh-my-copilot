---
name: plugin-review
description: Review the reusable plugin package without confusing it with root-local aliases.
agent: reviewer
argument-hint: "[optional plugin target]"
---

Review the reusable plugin package under `packages/copilot-cli-plugin/`.

Focus on:

- namespaced plugin agent usage
- plugin install proof
- plugin hook behavior
- drift between root workspace and plugin package

Do not treat root-local aliases as plugin proof.
