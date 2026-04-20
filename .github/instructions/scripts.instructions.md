---
applyTo: "scripts/**/*.sh,packages/copilot-cli-plugin/scripts/**/*.sh,packages/copilot-cli-plugin/skills/**/*.sh,.github/skills/**/*.sh"
---

# Script instructions

- Use Bash with `set -euo pipefail` for executable shell scripts.
- Keep scripts runnable from the repository root unless documented otherwise.
- Quote variable expansions and avoid destructive commands unless the task
  explicitly requires them.
- Prefer existing validation scripts over new wrappers.
- Hook and validation output should identify whether evidence comes from the
  root workspace, plugin package, or an example workspace.
