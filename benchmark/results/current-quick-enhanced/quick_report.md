# Benchmark Results (quick)

Root: `/home/zeyufu/Desktop/oh-my-copilot`

Invocation root: `/home/zeyufu/Desktop/oh-my-copilot`

Variant: `enhanced`

| Check | Result | Duration (s) | Markers |
| --- | --- | ---: | --- |
| `docs_validation` | PASS | 0.19 | — |
| `power_validation` | PASS | 0.08 | `REFINEMENT_MAP_OK`, `PLUGIN_BOUNDARY_OK`, `DISCOVERABILITY_OK` |
| `root_validation` | PASS | 0.12 | — |
| `smoke_cli` | PASS | 35.8 | `ROOT_AGENT_OK`, `PLUGIN_AGENT_OK`, `TASK_SCENARIO_OK` |

## Evaluation contract

| Variant | Score | Threshold | Release gate | Vanilla floor | Required delta vs vanilla |
| --- | ---: | ---: | --- | ---: | ---: |
| `enhanced` | 140/140 | 140/140 | PASS | 90/140 | 50 |

- Improvement summary: Enhanced evidence improved by 50 over the vanilla floor; benchmark-backed uplift observed.
- Investigation required: no

| Dimension | Required | Passed | Weight |
| --- | --- | --- | ---: |
| `docs_validation` | yes | PASS | 15 |
| `power_validation` | yes | PASS | 15 |
| `root_validation` | yes | PASS | 15 |
| `REFINEMENT_MAP_OK` | yes | PASS | 10 |
| `PLUGIN_BOUNDARY_OK` | yes | PASS | 10 |
| `DISCOVERABILITY_OK` | yes | PASS | 10 |
| `smoke_cli` | yes | PASS | 15 |
| `ROOT_AGENT_OK` | yes | PASS | 20 |
| `PLUGIN_AGENT_OK` | yes | PASS | 20 |
| `TASK_SCENARIO_OK` | yes | PASS | 10 |

## docs_validation

```text
ok: research/omc-analysis.md has an Evidence section
ok: research/omc-analysis.md has an Inference/Assumption section
ok: research/omx-analysis.md has an Evidence section
ok: research/omx-analysis.md has an Inference/Assumption section
ok: research/copilot-cli-capabilities.md has an Evidence section
ok: research/copilot-cli-capabilities.md has an Inference/Assumption section
ok: mapping distinguishes source-backed claims from inference
ok: scope creep terms are bounded
ok: illustrative hook policy JSON is valid
ok: internal Markdown links resolve
ok: external link checks skipped (set CHECK_EXTERNAL=1 to enable)
ok: oh-my-copilot docs/research/examples validation complete
```

## power_validation

```text
ok: plugin hooks.json has versioned schema
ok: README mentions VS Code layout
ok: README mentions Copilot CLI plugin package
ok: README Start here section exposes refinement-priority, plugin-boundary, and benchmark-status links
ok: REFINEMENT_MAP_OK
ok: PLUGIN_BOUNDARY_OK
ok: DISCOVERABILITY_OK
ok: cross-host app overview preserves isolated presentation boundary
ok: cross-host methodology route names comparability classes
ok: cross-host presentation primitives preserve repo-native warning
ok: cross-host benchmark site files exist and generated data validates
ok: power surfaces validation complete
```

## root_validation

```text
ok: post-tool hook logs root-workspace source
ok: root hook config uses shared schema
ok: README distinguishes root workspace from plugin/example surfaces
ok: README mentions reusable plugin package
ok: README keeps examples illustrative
ok: root registration doc states plugin canonicality
ok: root registration doc keeps examples as examples
ok: cross-host app layout frames evidence-oriented presentation
ok: cross-host overview keeps repo-native benchmark wording
ok: cross-host methodology route explains comparability classes
ok: CI runs root Copilot surface validation
ok: root Copilot surface validation complete
```

## smoke_cli

```text
Run 'copilot update' to check for updates.
ok: copilot CLI version command succeeds
ok: copilot help exposes agent/plugin options
ok: copilot plugin command is available
ok: root reviewer/research/verifier agents exist
ok: plugin metadata parses for oh-my-copilot-power-pack@0.1.0
ok: installed plugin entry found in ~/.copilot/config.json
ok: root reviewer agent prompt smoke returned ROOT_AGENT_OK
ok: namespaced plugin reviewer agent prompt smoke returned PLUGIN_AGENT_OK
ok: task scenario smoke returned TASK_SCENARIO_OK
ok: Copilot smoke proves route availability only; cross-host comparability is validated by separate benchmark harvest gates
ok: Copilot CLI smoke validation complete
```
