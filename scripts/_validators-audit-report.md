# Validators Audit Report

Wave 9 — LOC delta summary and recommended follow-up actions.
**No deletions or merges happen in this wave.** The coverage matrix gates that work.

Generated: 2026-05-06.

---

## LOC before this wave

| Validator | LOC |
|---|---|
| `validate-benchmark-evidence.sh` | 252 |
| `validate-copilot-state-contract.sh` | 144 |
| `validate-doc-links.sh` | 518 |
| `validate-pages-surface.sh` | 89 |
| `validate-power-surfaces.sh` | 197 |
| `validate-release-readiness.sh` | 135 |
| `validate-root-copilot-surfaces.sh` | 520 |
| `smoke-copilot-cli.sh` | 321 |
| `check-install-state.sh` | 201 |
| `prove-vscode-hook-standalone.sh` | 25 |
| `bootstrap-copilot-power.sh` | 39 |
| **Total** | **2441** |

---

## LOC after this wave

Wave 9 adds dynamic-count assertions to `validate-power-surfaces.sh` (+~40 LOC) and
adds overlap-documentation comments to `check-install-state.sh` (+~8 LOC). No deletions.

| Validator | LOC (est. after wave 9) | Delta |
|---|---|---|
| `validate-benchmark-evidence.sh` | 252 | 0 |
| `validate-copilot-state-contract.sh` | 144 | 0 |
| `validate-doc-links.sh` | 518 | 0 |
| `validate-pages-surface.sh` | 89 | 0 |
| `validate-power-surfaces.sh` | ~237 | +~40 |
| `validate-release-readiness.sh` | 135 | 0 |
| `validate-root-copilot-surfaces.sh` | 520 | 0 |
| `smoke-copilot-cli.sh` | 321 | 0 |
| `check-install-state.sh` | ~209 | +~8 |
| `prove-vscode-hook-standalone.sh` | 25 | 0 |
| `bootstrap-copilot-power.sh` | 39 | 0 |
| **Total** | **~2489** | **+~48** |

---

## Recommended deletions/moves (after coverage matrix sign-off)

These actions are **blocked** until the matrix is reviewed. Estimated LOC savings listed.

| Action | Script | LOC saved | Condition |
|---|---|---|---|
| MERGE_INTO `validate-power-surfaces.sh` | `validate-root-copilot-surfaces.sh` | ~480 net (keep ~40 unique lines in target) | Agent/prompt wiring section + hook execution section added to `validate-power-surfaces.sh` first |
| MERGE_INTO `validate-power-surfaces.sh` | `validate-pages-surface.sh` | ~75 net (keep ~14 deploy-workflow lines in target) | Deploy-workflow assertion section added to `validate-power-surfaces.sh` first |
| MERGE_INTO `check-install-state.sh` | `validate-copilot-state-contract.sh` | ~110 net (keep ~34 unique state-contract lines in target) | cache-path-under-home + workspace-root assertions moved to `check-install-state.sh` first |

**Total estimated LOC saved:** ~665

---

## Estimated final validator LOC after follow-up

| Validator | Estimated final LOC |
|---|---|
| `validate-power-surfaces.sh` (absorbs root + pages) | ~510 |
| `smoke-copilot-cli.sh` | ~321 |
| `validate-doc-links.sh` | ~518 |
| `validate-benchmark-evidence.sh` | ~252 |
| `check-install-state.sh` (absorbs state-contract) | ~235 |
| `validate-release-readiness.sh` | ~135 |
| `prove-vscode-hook-standalone.sh` | ~25 |
| `bootstrap-copilot-power.sh` | ~39 |
| **Total** | **~2035** |

Estimated reduction: ~2489 → ~2035 (~**18% trim**).

Note: the plan spec estimated 40–50% trim assuming more aggressive merges. Achieving
that range would require also collapsing `validate-benchmark-evidence.sh` into
`validate-power-surfaces.sh` (saves ~252 LOC) and trimming `validate-doc-links.sh`
self-test fixture (~150 LOC). Those merges require separate sign-off beyond Wave 9.

---

## Next steps

1. Review and sign off `_validators-coverage-matrix.md`.
2. For each MERGE_INTO row: add the unique assertions to the target validator, run
   `bash -n <target>` and full CI, then delete the source validator.
3. Update `validate-release-readiness.sh` call list after each deletion.
4. Re-run this audit after follow-up merges to confirm LOC targets.
