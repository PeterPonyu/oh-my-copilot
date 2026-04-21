# Benchmark Results (quick)

Root: `/home/zeyufu/Desktop/oh-my-copilot`

Variant: `vanilla`

| Check | Result | Duration (s) | Markers |
| --- | --- | ---: | --- |
| `docs_validation` | PASS | 0.12 | — |
| `power_validation` | PASS | 0.04 | — |
| `root_validation` | PASS | 0.12 | — |
| `smoke_cli` | PASS | 1.57 | — |

## Evaluation contract

| Variant | Score | Threshold | Release gate | Vanilla floor | Required delta vs vanilla |
| --- | ---: | ---: | --- | ---: | ---: |
| `vanilla` | 60/100 | 60/100 | PASS | 60/100 | 40 |

| Dimension | Required | Passed | Weight |
| --- | --- | --- | ---: |
| `docs_validation` | yes | PASS | 15 |
| `power_validation` | yes | PASS | 15 |
| `root_validation` | yes | PASS | 15 |
| `smoke_cli` | yes | PASS | 15 |
| `ROOT_AGENT_OK` | no | FAIL | 20 |
| `PLUGIN_AGENT_OK` | no | FAIL | 20 |

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
ok: implementer agent hands off to reviewer
ok: reviewer agent hands off to verifier
ok: VS Code hook policy uses native SessionStart event
ok: VS Code hook policy uses native PostToolUse event
ok: VS Code settings enable AGENTS.md loading
ok: VS Code settings enable skills
ok: VS Code prompt file uses a custom agent
ok: plugin.json parses and includes core keys
ok: plugin hooks.json has versioned schema
ok: README mentions VS Code layout
ok: README mentions Copilot CLI plugin package
ok: power surfaces validation complete
```

## root_validation

```text
ok: root hook policy parses and calls root scripts
ok: root hook policy is versioned
ok: session hook logs root-workspace source
ok: post-tool hook logs root-workspace source
ok: root hook config uses shared schema
ok: README distinguishes root workspace from plugin/example surfaces
ok: README mentions reusable plugin package
ok: README keeps examples illustrative
ok: root registration doc states plugin canonicality
ok: root registration doc keeps examples as examples
ok: CI runs root Copilot surface validation
ok: root Copilot surface validation complete
```

## smoke_cli

```text
GitHub Copilot CLI 1.0.32.
Run 'copilot update' to check for updates.
ok: copilot CLI version command succeeds
ok: copilot help exposes agent/plugin options
ok: copilot plugin command is available
ok: root reviewer/research/verifier agents exist
ok: plugin metadata parses for oh-my-copilot-power-pack@0.1.0
ok: installed plugin entry found in ~/.copilot/config.json
ok: model-backed agent prompt smoke skipped (set RUN_COPILOT_AGENT_SMOKE=1 to enable)
ok: Copilot CLI smoke validation complete
```
