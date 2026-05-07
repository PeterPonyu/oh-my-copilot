# Publication Review Notes

_Last reviewed: April 20, 2026_

## Verdict

Approved with v1 bounds. The repository is coherent as a docs-first public
research corpus if it keeps the Copilot CLI-only boundary visible and avoids
runtime parity language.

## Quality checks applied in this draft

- Source lanes are split into Copilot capability research, OMC synthesis, and
  OMX synthesis.
- Public docs are split into design spec, comparison matrix, native mapping,
  references, and repo blueprint.
- Example files are isolated under `examples/copilot-cli-layout/` and repeatedly
  labeled illustrative.
- Verification is limited to docs hygiene and scope checks, matching the v1
  non-goal of avoiding runtime machinery.

## Risks

| Risk | Mitigation |
| --- | --- |
| Copilot CLI docs may change quickly. | Keep access dates in `docs/references.md` and re-check before release. |
| Readers may mistake examples for a supported runtime. | Labels in README, blueprint, example AGENTS, skills, and hooks state illustrative status. |
| OMC/OMX names may imply parity. | Comparison and mapping docs explicitly separate lineage from implementation contract. |
| Skill path support should be verified before strong claims. | Mapping uses medium confidence for project skill location and asks for live Copilot CLI verification. |

## Follow-ups before a public announcement

- Run the examples in a real Copilot CLI session and record results.
- Decide whether to add badges only after the repo has CI running publicly.
- Revisit license ownership if a named organization owns the eventual project.
