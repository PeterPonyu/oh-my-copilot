---
applyTo: ".github/**,examples/**/.github/**,packages/copilot-cli-plugin/**"
---

# [OMCP] Copilot surface instructions

- `packages/copilot-cli-plugin/**` is the canonical source for reusable installed
  plugin behavior and mirrored root agents, prompts, skills, and instructions.
- Root `.github/**` files register the current repository as a Copilot workspace
  and should be regenerated from plugin sources when mirrored assets change.
- `examples/**/.github/**` remains example-specific and must not be treated as a
  root source of truth.
- Keep prompt `agent:` values and agent handoffs pointing to agents that exist in
  the same surface unless the file is explicitly testing a namespaced plugin
  route.
- Prefer plugin-canonical skills and agents over duplicated root-only logic.
- Run `./scripts/check-mirror-drift.sh`,
  `node scripts/validate-plugin-orchestration.mjs`, and
  `./scripts/validate-power-surfaces.sh` after surface edits.
