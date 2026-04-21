# Benchmark Evaluation (full, enhanced)

- Score: **100/100**
- Threshold: **100/100**
- Release gate: **PASS**
- Vanilla floor: **70/100**
- Actual delta vs vanilla floor: **30**
- Required delta vs vanilla floor: **30**

| Dimension | Required | Passed | Weight | Description |
| --- | --- | --- | ---: | --- |
| `docs_validation` | yes | PASS | 10 | docs validation stays green |
| `power_validation` | yes | PASS | 10 | power surface validation stays green |
| `root_validation` | yes | PASS | 10 | root surface validation stays green |
| `smoke_cli` | yes | PASS | 10 | basic Copilot CLI smoke passes |
| `bootstrap` | yes | PASS | 10 | bootstrap flow still succeeds |
| `install_state` | yes | PASS | 10 | install-state proof returns INSTALL_STATE: ok |
| `standalone_hook_proof` | yes | PASS | 10 | standalone hook proof reports example/plugin sources |
| `ROOT_AGENT_OK` | yes | PASS | 15 | root reviewer prompt smoke returns ROOT_AGENT_OK |
| `PLUGIN_AGENT_OK` | yes | PASS | 15 | namespaced plugin reviewer prompt smoke returns PLUGIN_AGENT_OK |
