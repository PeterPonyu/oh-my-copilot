# Installation

This guide keeps setup intentionally small: validate the checkout, install the
local Copilot CLI plugin when prerequisites exist, then collect proof.

## Prerequisites

| Tool | Why it is needed | How this repo checks it |
| --- | --- | --- |
| `bash` | Runs repository validation and bootstrap scripts. | Required by every script under `scripts/`. |
| `python3` | Parses JSON and validates internal Markdown links. | Used by `validate-doc-links.sh` and bootstrap config checks. |
| `node` >= 22 | Runs the bundled MCP server (`node ./mcp-server/dist/server.mjs`). | Check with `node --version`; the MCP server package declares `engines.node >=22`. |
| `copilot` | Installs and exercises the local Copilot CLI plugin. | Required by `bootstrap-copilot-power.sh`. |
| `gh` | Supports GitHub/Copilot CLI authenticated workflows. | Required by `bootstrap-copilot-power.sh`. |

The docs and root-surface validation scripts are useful even before `copilot` or
`gh` are available. The full plugin/MCP path requires Node.js 22 or newer, and
the full bootstrap path also requires both `copilot` and `gh`.

## Install path

Run commands from the repository root.

### Install only the Copilot CLI plugin (no bootstrap)

If `copilot` is already on `PATH` and you only want the reusable plugin package
without running the full bootstrap pipeline:

```bash
copilot plugin install "$(pwd)/packages/copilot-cli-plugin"
```

Use an absolute path instead of `$(pwd)` when running from another working directory.
Copilot CLI may warn that direct plugin installs from local paths, repositories, or
URLs are deprecated; the upstream warning is tracked in
[github/copilot-cli#2877](https://github.com/github/copilot-cli/issues/2877), and
GitHub's CLI reference documents marketplace installs with the
`plugin@marketplace` form. The local-path install remains the supported
development and verification path for this repository today. The planned release
install target is `omcp@oh-my-copilot` once the `oh-my-copilot` marketplace is
published and added with `copilot plugin marketplace add`. Until then, keep
automation pinned to the local package path above and treat the warning as a
forward-compatibility notice rather than a setup failure.

Upstream references for manifest shape and plugin behavior:

- [About plugins for GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/copilot-cli/about-cli-plugins)
- [Creating a plugin for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating)
- [GitHub Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)

Full verification (docs validators, root surfaces, hook proofs) still lives in
[`bootstrap-copilot-power.sh`](../scripts/bootstrap-copilot-power.sh); see below.

### 1. Validate the checkout

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/validate-copilot-state-contract.sh
```

Expected result: each command prints `ok:` lines and exits with status 0.

### 2. Bootstrap the Copilot power pack

```bash
./scripts/bootstrap-copilot-power.sh
```

The bootstrap script currently does four things:

1. verifies that `copilot` is on `PATH`;
2. verifies that `gh` is on `PATH`;
3. installs the local plugin package from `packages/copilot-cli-plugin`; and
4. runs the docs, plugin/root-surface, standalone hook proof scripts, and the Copilot state-contract check.

It also checks `~/.copilot/config.json` for an installed plugin entry named
`omcp`.

### 3. Read the install-state summary

Run:

```bash
./scripts/check-install-state.sh
./scripts/validate-copilot-state-contract.sh
```

This prints a short summary after the detailed checks so you can quickly see:

- which root was checked
- which plugin manifest was used
- which Copilot config file was inspected
- whether the local install proof passed

## Install proof matrix

| Proof | Command | Passing evidence |
| --- | --- | --- |
| Docs and internal links | `./scripts/validate-doc-links.sh` | Ends with `ok: oh-my-copilot docs/research/examples validation complete`. |
| Plugin and example surface contract | `./scripts/validate-power-surfaces.sh` | Reports required plugin/root/example files and routes as present. |
| Root Copilot registration | `./scripts/validate-root-copilot-surfaces.sh` | Reports root instructions, agents, prompts, skills, and hooks as valid. |
| Bootstrap and plugin config | `./scripts/bootstrap-copilot-power.sh` | Prints `ok: bootstrap complete` after plugin config and validation checks. |
| Install-state proof | `./scripts/check-install-state.sh` | Prints `INSTALL_STATE: ok` and a short install-state summary. |
| State-contract proof | `./scripts/validate-copilot-state-contract.sh` | Confirms the plugin source path is canonical and local hook/log state stays project-local. |

## Troubleshooting

### `copilot CLI not found`

Install or expose GitHub Copilot CLI in `PATH`, then rerun the bootstrap script.
You can still run the three validation scripts before the Copilot CLI is ready.

### `gh CLI not found`

Install or expose GitHub CLI in `PATH`. The bootstrap path treats it as a hard
prerequisite because the intended user workflow is GitHub/Copilot CLI centered.

### Plugin config entry is missing

Rerun `./scripts/bootstrap-copilot-power.sh` from the repository root and inspect
the tail of `/tmp/omc-plugin-install.out` that the script prints. Keep root
workspace behavior and installed plugin behavior distinct when diagnosing the
failure. If `./scripts/check-install-state.sh` reports a transient `.omx`
worker path, rerun bootstrap from the canonical repository root so the plugin
source path is repaired.

### `~/.copilot/config.json` is unreadable JSON

If `./scripts/validate-copilot-state-contract.sh` fails while claiming Copilot
config JSON cannot be parsed, repair or temporarily remove the file so Copilot
CLI can regenerate valid metadata (`bootstrap-copilot-power.sh` expects sane
install-state reads).

### A docs or surface validator fails

Read the first `FAIL:` line and fix the named path or route. The validators are
intended to catch drift such as broken Markdown links, prompt agents that do not
exist, root skills that do not call root-relative commands, or examples being
mistaken for root proof.

## Uninstall or reset

This repository does not currently provide an uninstall wrapper. Use Copilot CLI
plugin management commands for installed plugin removal, and remove local
`.copilot-hooks/` evidence only when you intentionally want to discard local
proof logs.
