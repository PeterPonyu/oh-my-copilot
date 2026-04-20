---
applyTo: ".github/**,examples/**/.github/**,packages/copilot-cli-plugin/**"
---

# Copilot surface instructions

- Root `.github/**` files register the current repository as a Copilot
  workspace; do not make them depend on nested example discovery.
- `packages/copilot-cli-plugin/**` remains canonical for reusable installed
  plugin behavior and namespaced routes such as
  `oh-my-copilot-power-pack:reviewer`.
- `examples/**/.github/**` remains example-specific and must not be treated as a
  root source of truth.
- Keep prompt `agent:` values and agent handoffs pointing to agents that exist in
  the same surface unless the file is explicitly testing a namespaced plugin
  route.
- Prefer wrapper-style root skills and agents over duplicated plugin logic.
- Run `./scripts/validate-power-surfaces.sh` after surface edits.
