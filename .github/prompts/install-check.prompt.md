---
name: install-check
description: Verify the current installation and bootstrap proof path.
agent: verifier
argument-hint: "[optional note]"
---

Verify the current installation state for this repository.

Prefer these commands:

- `./scripts/check-install-state.sh`
- `./scripts/bootstrap-copilot-power.sh`
- `./scripts/smoke-copilot-cli.sh`

Separate:

- root workspace proof
- plugin install proof
- example-only proof
