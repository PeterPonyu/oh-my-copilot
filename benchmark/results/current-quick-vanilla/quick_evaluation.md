# Benchmark Evaluation (quick, vanilla)

- Contract score: **90/90**
- Contract threshold: **90/90**
- Release gate: **PASS**
- Vanilla floor reference: **90**
- Actual delta vs vanilla floor: **0**
- Enhanced-only uplift budget: **50**
- Improvement summary: Vanilla reference run establishes the comparison floor; use an enhanced run to measure prompt-smoke uplift.
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
