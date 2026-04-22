# Benchmark Evaluation (full, enhanced)

- Contract score: **125/125**
- Contract threshold: **125/125**
- Release gate: **PASS**
- Vanilla floor reference: **85**
- Actual delta vs vanilla floor: **40**
- Enhanced-only uplift budget: **40**
- Improvement summary: Enhanced evidence improved by 40 over the vanilla floor; benchmark-backed uplift observed.
- Investigation required: **no**

| Dimension | Required | Passed | Weight | Description |
| --- | --- | --- | ---: | --- |
| `docs_validation` | yes | PASS | 10 | docs validation stays green |
| `power_validation` | yes | PASS | 10 | power surface validation stays green |
| `root_validation` | yes | PASS | 10 | root surface validation stays green |
| `REFINEMENT_MAP_OK` | yes | PASS | 5 | README exposes the refinement-priority map |
| `PLUGIN_BOUNDARY_OK` | yes | PASS | 5 | README exposes the plugin-boundary review |
| `DISCOVERABILITY_OK` | yes | PASS | 5 | README Start here path exposes the key proof docs together |
| `smoke_cli` | yes | PASS | 10 | basic Copilot CLI smoke passes |
| `bootstrap` | yes | PASS | 10 | bootstrap flow still succeeds |
| `install_state` | yes | PASS | 10 | install-state proof returns INSTALL_STATE: ok |
| `standalone_hook_proof` | yes | PASS | 10 | standalone hook proof reports example/plugin sources |
| `ROOT_AGENT_OK` | yes | PASS | 15 | root reviewer prompt smoke returns ROOT_AGENT_OK |
| `PLUGIN_AGENT_OK` | yes | PASS | 15 | namespaced plugin reviewer prompt smoke returns PLUGIN_AGENT_OK |
| `TASK_SCENARIO_OK` | yes | PASS | 10 | agent can answer a constrained practical repo-task question |
