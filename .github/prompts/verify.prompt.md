---
name: verify
description: Root alias for verifying docs, prompt, agent, skill, hook, or plugin-surface changes.
agent: verifier
argument-hint: "[target file or changed surface]"
---

Verify the requested root workspace change using the root verifier agent.

This short alias should produce explicit evidence rather than "looks good"
claims. Choose checks based on the changed surface:

- docs or research changes: `./scripts/validate-doc-links.sh`;
- agents, prompts, skills, hooks, plugin, or examples:
  `./scripts/validate-power-surfaces.sh`;
- root Copilot registration changes:
  `./scripts/validate-root-copilot-surfaces.sh`.

Report automated PASS/FAIL evidence separately from manual Copilot smoke-test
items. Keep root workspace evidence distinct from namespaced plugin behavior
such as `oh-my-copilot-power-pack:verifier`.
