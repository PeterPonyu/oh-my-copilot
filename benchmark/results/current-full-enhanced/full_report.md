# Benchmark Results (full)

Root: `/home/zeyufu/Desktop/oh-my-copilot`

Invocation root: `/home/zeyufu/Desktop/oh-my-copilot`

Variant: `enhanced`

| Check | Result | Duration (s) | Markers |
| --- | --- | ---: | --- |
| `docs_validation` | PASS | 0.21 | — |
| `power_validation` | PASS | 0.07 | — |
| `root_validation` | PASS | 0.14 | — |
| `smoke_cli` | PASS | 42.42 | `ROOT_AGENT_OK`, `PLUGIN_AGENT_OK` |
| `bootstrap` | PASS | 16.92 | `INSTALL_STATE: ok`, `source=example-workspace`, `source=plugin` |
| `install_state` | PASS | 0.04 | `INSTALL_STATE: ok` |
| `standalone_hook_proof` | PASS | 13.7 | `source=example-workspace`, `source=plugin` |

## Evaluation contract

| Variant | Score | Threshold | Release gate | Vanilla floor | Required delta vs vanilla |
| --- | ---: | ---: | --- | ---: | ---: |
| `enhanced` | 100/100 | 100/100 | PASS | 70/100 | 30 |

| Dimension | Required | Passed | Weight |
| --- | --- | --- | ---: |
| `docs_validation` | yes | PASS | 10 |
| `power_validation` | yes | PASS | 10 |
| `root_validation` | yes | PASS | 10 |
| `smoke_cli` | yes | PASS | 10 |
| `bootstrap` | yes | PASS | 10 |
| `install_state` | yes | PASS | 10 |
| `standalone_hook_proof` | yes | PASS | 10 |
| `ROOT_AGENT_OK` | yes | PASS | 15 |
| `PLUGIN_AGENT_OK` | yes | PASS | 15 |

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
ok: VS Code settings enable AGENTS.md loading
ok: VS Code settings enable skills
ok: VS Code prompt file uses a custom agent
ok: plugin.json parses and includes core keys
ok: plugin hooks.json has versioned schema
ok: README mentions VS Code layout
ok: README mentions Copilot CLI plugin package
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
GitHub Copilot CLI 1.0.34.
Run 'copilot update' to check for updates.
ok: copilot CLI version command succeeds
ok: copilot help exposes agent/plugin options
ok: copilot plugin command is available
ok: root reviewer/research/verifier agents exist
ok: plugin metadata parses for oh-my-copilot-power-pack@0.1.0
ok: installed plugin entry found in ~/.copilot/config.json
ok: root reviewer agent prompt smoke returned ROOT_AGENT_OK
ok: namespaced plugin reviewer agent prompt smoke returned PLUGIN_AGENT_OK
ok: Copilot smoke proves route availability only; cross-host comparability is validated by separate benchmark harvest gates
ok: Copilot CLI smoke validation complete
```

## bootstrap

```text
ok: cross-host methodology route explains comparability classes
ok: CI runs root Copilot surface validation
ok: root Copilot surface validation complete
ok: standalone workspace hook proof succeeded
log:
source=example-workspace event=sessionStart timestamp=2026-04-21T15:00:37Z cwd=/tmp/vscode-copilot-layout-standalone
source=plugin event=sessionStart timestamp=2026-04-21T15:00:37Z cwd=/tmp/vscode-copilot-layout-standalone
ok: bootstrap complete

Changes   +0 -0
Requests  1 Premium (13s)
Tokens    ↑ 17.7k • ↓ 94 • 16.9k (cached) • 85 (reasoning)
```

## install_state

```text
ok: installed source path is canonical: /home/zeyufu/Desktop/oh-my-copilot/packages/copilot-cli-plugin
ok: plugin config entry found in /home/zeyufu/.copilot/config.json
ok: installed plugin cache verified at /home/zeyufu/.copilot/installed-plugins/_direct/copilot-cli-plugin
INSTALL_STATE: ok

INSTALL_STATE_SUMMARY
=====================
- Root: /home/zeyufu/Desktop/oh-my-copilot
- Plugin manifest: /home/zeyufu/Desktop/oh-my-copilot/packages/copilot-cli-plugin/plugin.json
- Copilot config: /home/zeyufu/.copilot/config.json
- Expected plugin name: oh-my-copilot-power-pack
- Result: PASS
```

## standalone_hook_proof

```text
ok: standalone workspace hook proof succeeded
log:
source=example-workspace event=sessionStart timestamp=2026-04-21T15:00:51Z cwd=/tmp/vscode-copilot-layout-standalone
source=plugin event=sessionStart timestamp=2026-04-21T15:00:51Z cwd=/tmp/vscode-copilot-layout-standalone
source=example-workspace event=sessionStart timestamp=2026-04-21T15:00:56Z cwd=/tmp/vscode-copilot-layout-standalone
source=plugin event=sessionStart timestamp=2026-04-21T15:00:56Z cwd=/tmp/vscode-copilot-layout-standalone

Changes   +0 -0
Requests  1 Premium (10s)
Tokens    ↑ 17.7k • ↓ 118 • 16.9k (cached) • 109 (reasoning)
```
