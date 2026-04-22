# Benchmark Evaluation (full, vanilla)

- Score: **80/110**
- Threshold: **80/110**
- Release gate: **PASS**
- Vanilla floor: **80/110**
- Actual delta vs vanilla floor: **0**
- Required delta vs vanilla floor: **30**
- Improvement summary: Vanilla reference run establishes the comparison floor; use an enhanced run to measure prompt-smoke uplift.
- Investigation required: **no**

| Dimension | Required | Passed | Weight | Description |
| --- | --- | --- | ---: | --- |
| `docs_validation` | yes | PASS | 10 | docs validation stays green |
| `power_validation` | yes | PASS | 10 | power surface validation stays green |
| `root_validation` | yes | PASS | 10 | root surface validation stays green |
| `REFINEMENT_MAP_OK` | yes | PASS | 5 | README exposes the refinement-priority map |
| `PLUGIN_BOUNDARY_OK` | yes | PASS | 5 | README exposes the plugin-boundary review |
| `smoke_cli` | yes | PASS | 10 | basic Copilot CLI smoke passes |
| `bootstrap` | yes | PASS | 10 | bootstrap flow still succeeds |
| `install_state` | yes | PASS | 10 | install-state proof returns INSTALL_STATE: ok |
| `standalone_hook_proof` | yes | PASS | 10 | standalone hook proof reports example/plugin sources |
| `ROOT_AGENT_OK` | no | FAIL | 15 | root reviewer prompt smoke returns ROOT_AGENT_OK |
| `PLUGIN_AGENT_OK` | no | FAIL | 15 | namespaced plugin reviewer prompt smoke returns PLUGIN_AGENT_OK |
