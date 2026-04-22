# Benchmark Evaluation (quick, vanilla)

- Score: **80/120**
- Threshold: **80/120**
- Release gate: **PASS**
- Vanilla floor: **80/120**
- Actual delta vs vanilla floor: **0**
- Required delta vs vanilla floor: **40**
- Improvement summary: Vanilla reference run establishes the comparison floor; use an enhanced run to measure prompt-smoke uplift.
- Investigation required: **no**

| Dimension | Required | Passed | Weight | Description |
| --- | --- | --- | ---: | --- |
| `docs_validation` | yes | PASS | 15 | docs validation stays green |
| `power_validation` | yes | PASS | 15 | power surface validation stays green |
| `root_validation` | yes | PASS | 15 | root surface validation stays green |
| `REFINEMENT_MAP_OK` | yes | PASS | 10 | README exposes the refinement-priority map |
| `PLUGIN_BOUNDARY_OK` | yes | PASS | 10 | README exposes the plugin-boundary review |
| `smoke_cli` | yes | PASS | 15 | basic Copilot CLI smoke passes |
| `ROOT_AGENT_OK` | no | FAIL | 20 | root reviewer prompt smoke returns ROOT_AGENT_OK |
| `PLUGIN_AGENT_OK` | no | FAIL | 20 | namespaced plugin reviewer prompt smoke returns PLUGIN_AGENT_OK |
