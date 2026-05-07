# Archived docs

Materials in this directory are kept for historical traceability but are
**not part of the current docs surface**. They are not linked from the
top-level repo or plugin READMEs and are not exercised by `validate-doc-links.sh`
(the validator skips paths under `_archive/`).

## What's here

| Path | Why archived | Successor |
|---|---|---|
| `review-notes.md` | Wave-time publication-review snapshot. Not cross-linked from any README or other doc. | The current state of the repo *is* the canonical surface; no successor doc needed. |
| `validation/agentic-2026-05-07-sample.md` | Wave-G/H agentic evidence captured via `copilot -p` and ad-hoc invocations. Superseded by tmux-interactive evidence. | `docs/validation/agentic-tmux-2026-05-07-wave-l.md` (real interactive `copilot` session — strictly stronger evidence). |
| `validation/validation-2026-05-07-sample.md` | Wave-F/G 17-check validation report (synthetic stdio). Superseded by the live runs of `scripts/run-validation.sh`. | Run `bash scripts/run-validation.sh` to regenerate fresh evidence on demand; the script is the artifact, not the report. |
| `parity-matrix.md` | OMC ↔ oh-my-copilot per-feature parity tracker. Project explicitly stopped framing itself in terms of parity to other plugins (Wave-N), so the matrix is no longer load-bearing. | Plugin surface is summarized in the root README's `## Plugin surface` table and the plugin README's `## Plugin inventory` table — both kept in sync with the actual install. |

## Why these specifically (and not the rest of `docs/`)

The qualifier was: archive **only** docs that are
(a) not runtime-necessary AND
(b) only development intermediates / wave-time records AND
(c) not cross-linked from any active doc or README.

Most top-level docs (`design-spec.md`, `parity-matrix.md`, `comparison-matrix.md`,
`copilot-native-mapping.md`, `refinement-priority-map.md`, `plugin-boundary-review.md`,
`benchmark-status.md`, `state-contract.md`, `root-registration.md`, `v1-repo-blueprint.md`,
`vscode-copilot-testing.md`, `release-checklist.md`, `release-notes-template.md`,
`hook-surface.md`, `installation.md`, `quick-start.md`, `usage.md`,
`known-limitations.md`, `references.md`, `plugin-root-divergence-registry.md`)
are explicitly cataloged in the root `README.md` as part of the docs-first
publication surface, so they stay.

## Recovering an archived file

```bash
git mv docs/_archive/<path> docs/<path>
# then re-link from the appropriate README
```
