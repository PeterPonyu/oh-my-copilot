# Benchmark Evaluation (quick, vanilla)

- Score: **60/100**
- Threshold: **60/100**
- Release gate: **PASS**
- Vanilla floor: **60/100**
- Actual delta vs vanilla floor: **0**
- Required delta vs vanilla floor: **40**

| Dimension | Required | Passed | Weight | Description |
| --- | --- | --- | ---: | --- |
| `docs_validation` | yes | PASS | 15 | docs validation stays green |
| `power_validation` | yes | PASS | 15 | power surface validation stays green |
| `root_validation` | yes | PASS | 15 | root surface validation stays green |
| `smoke_cli` | yes | PASS | 15 | basic Copilot CLI smoke passes |
| `ROOT_AGENT_OK` | no | FAIL | 20 | root reviewer prompt smoke returns ROOT_AGENT_OK |
| `PLUGIN_AGENT_OK` | no | FAIL | 20 | namespaced plugin reviewer prompt smoke returns PLUGIN_AGENT_OK |
