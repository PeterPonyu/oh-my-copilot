# Benchmark Results (full)

Root: `/home/zeyufu/Desktop/oh-my-copilot`

| Check | Result | Duration (s) |
| --- | --- | ---: |
| `docs_validation` | PASS | 0.13 |
| `power_validation` | PASS | 0.04 |
| `root_validation` | PASS | 0.12 |
| `smoke_cli` | PASS | 42.65 |
| `bootstrap` | PASS | 39.78 |
| `install_state` | PASS | 0.02 |
| `standalone_hook_proof` | PASS | 45.09 |

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
ok: root reviewer agent prompt smoke returned ROOT_AGENT_OK
ok: namespaced plugin reviewer agent prompt smoke returned PLUGIN_AGENT_OK
ok: Copilot CLI smoke validation complete
```

## bootstrap

```text
ok: root registration doc keeps examples as examples
ok: CI runs root Copilot surface validation
ok: root Copilot surface validation complete
ok: standalone workspace hook proof succeeded
log:
source=example-workspace event=sessionStart timestamp=2026-04-20T16:21:00Z cwd=/tmp/vscode-copilot-layout-standalone
source=plugin event=sessionStart timestamp=2026-04-20T16:21:00Z cwd=/tmp/vscode-copilot-layout-standalone
ok: bootstrap complete

Changes   +0 -0
Requests  1 Premium (37s)
Tokens    ↑ 17.6k • ↓ 256 • 16.9k (cached) • 247 (reasoning)
```

## install_state

```text
ok: installed source path exists: /home/zeyufu/Desktop/oh-my-copilot/packages/copilot-cli-plugin
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
source=example-workspace event=sessionStart timestamp=2026-04-20T16:21:42Z cwd=/tmp/vscode-copilot-layout-standalone
source=plugin event=sessionStart timestamp=2026-04-20T16:21:42Z cwd=/tmp/vscode-copilot-layout-standalone

Changes   +0 -0
Requests  1 Premium (43s)
Tokens    ↑ 17.6k • ↓ 126 • 16.9k (cached) • 117 (reasoning)
```
