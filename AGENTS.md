# oh-my-copilot Agent Instructions

This repository is a Copilot CLI-first research and registration workspace. Work
from the repository root unless a task explicitly targets an example workspace or
the reusable plugin package.

## Scope and boundaries

- Preserve the project boundary: `oh-my-copilot` adapts lessons from
  `oh-my-claudecode` and `oh-my-codex` to Copilot-native primitives; it is not a
  runtime framework and does not claim OMC/OMX parity.
- Treat the root workspace, `packages/copilot-cli-plugin/`, and `examples/` as
  distinct surfaces with different source-of-truth roles.
- Keep reusable Copilot CLI plugin behavior canonical in
  `packages/copilot-cli-plugin/` unless a task explicitly changes root-only
  registration or example-only smoke-test assets.
- Keep examples illustrative and labelled as examples. Do not use nested example
  behavior as proof of root workspace behavior.
- Do not add dependencies without an explicit plan and verification path.

## Source-of-truth map

| Surface | Canonical owner | Notes |
| --- | --- | --- |
| Root instructions and prompts | Root `AGENTS.md` and `.github/` | Current-directory workspace registration. |
| Reusable agents, skills, hooks, plugin metadata | `packages/copilot-cli-plugin/` | Installed-plugin route; keep namespaced behavior reusable. |
| VS Code and CLI examples | `examples/` | Smoke-test and documentation examples, not hidden root dependencies. |
| Docs/research claims | `README.md`, `docs/`, `research/` | Separate evidence from inference and avoid overclaiming. |

## Working rules

- Prefer small, reviewable edits that reuse existing scripts and files.
- Keep root-local agents and prompts aligned with plugin-equivalent behavior when
  a plugin equivalent exists; document intentional differences.
- When editing `.github/**`, validate frontmatter and ensure all referenced
  agents, prompts, skills, scripts, and hooks exist.
- When editing docs or public copy, preserve CLI-first wording and clearly label
  unsupported behavior as inference, illustrative, or future work.
- When editing shell scripts, use `set -euo pipefail`, quote variables, and keep
  commands runnable from the repository root.

## Verification

Before declaring completion, run the checks that match the changed surface:

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
```

If root surface validation exists, run it too. For root hook or Copilot discovery
changes, collect explicit root-session evidence from `.copilot-hooks/*.log` and
state what remains manual or version-dependent.
