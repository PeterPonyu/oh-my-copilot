# Benchmark Evaluation (quick, enhanced)

- Contract score: **160/160**
- Contract threshold: **160/160**
- Release gate: **PASS**
- Vanilla floor reference: **90**
- Actual delta vs vanilla floor: **70**
- Enhanced-only uplift budget: **70**
- Improvement summary: Enhanced evidence improved by 70 over the vanilla floor; benchmark-backed uplift observed.
- Investigation required: **no**

| Dimension | Required | Passed | Weight | Description |
| --- | --- | --- | ---: | --- |
| `docs_validation` | yes | PASS | 15 | docs validation stays green |
| `power_validation` | yes | PASS | 15 | power surface validation stays green |
| `root_validation` | yes | PASS | 15 | root surface validation stays green |
| `REFINEMENT_MAP_OK` | yes | PASS | 10 | README exposes the refinement-priority map |
| `PLUGIN_BOUNDARY_OK` | yes | PASS | 10 | README exposes the plugin-boundary review |
| `DISCOVERABILITY_OK` | yes | PASS | 10 | README Start here path exposes the key proof docs together |
| `smoke_cli` | yes | PASS | 15 | basic Copilot CLI smoke passes |
| `ROOT_AGENT_OK` | yes | PASS | 20 | root reviewer prompt smoke returns ROOT_AGENT_OK |
| `PLUGIN_AGENT_OK` | yes | PASS | 20 | namespaced plugin reviewer prompt smoke returns PLUGIN_AGENT_OK |
| `TASK_SCENARIO_OK` | yes | PASS | 10 | agent can answer a constrained practical repo-task question |
| `TASK_PLAN_OK` | yes | PASS | 10 | agent can choose the right validator/doc for benchmark-proof drift |
| `TASK_COMMAND_OK` | yes | PASS | 10 | agent can choose the right enhanced benchmark command path |
