# oh-my-copilot

`oh-my-copilot` is a small, Copilot CLI-first power pack for making a repository
feel ready for practical GitHub Copilot CLI work: clear instructions, short root
agents, reusable plugin assets, validation scripts, and docs that explain what is
safe to trust.

V1 is intentionally **Copilot CLI-first** and **docs/research-first**. It is not
a runtime framework, not an [`oh-my-claudecode`](./research/omc-analysis.md) or
[`oh-my-codex`](./research/omx-analysis.md) parity clone, and not a claim that
Copilot cloud agent, IDE integrations, or SDK runtimes share one implementation.
Those multi-surface expansions are out of scope for v1.

## Start here

| Need | Read or run |
| --- | --- |
| Install and prove the repo is alive | [Installation](./docs/installation.md) |
| Get productive in one pass | [Quick start](./docs/quick-start.md) |
| Use root agents, prompts, skills, and plugin routes | [Usage](./docs/usage.md) |
| Understand current boundaries | [Known limitations](./docs/known-limitations.md) |
| Prepare a release | [Release checklist](./docs/release-checklist.md) |

Fast path from the repository root:

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/bootstrap-copilot-power.sh
```

`bootstrap-copilot-power.sh` is the canonical setup/proof path when both
`copilot` and `gh` are installed. The validation scripts are useful first
because they do not require a live Copilot CLI login.

## What this repo gives you

- Root workspace guidance through [`AGENTS.md`](./AGENTS.md),
  [`.github/copilot-instructions.md`](./.github/copilot-instructions.md), and
  path-specific `.github/instructions/` files.
- Short root-local agents for common work: `reviewer`, `verifier`, and
  `research`.
- Root prompts such as `/review-scope`, `/ship-docs`, and
  `/root-registration-check` that route to those root agents.
- Root skills for docs shipping, parity-claim guarding, and root surface audits.
- A reusable plugin package under
  [`packages/copilot-cli-plugin/`](./packages/copilot-cli-plugin/) for installed,
  namespaced Copilot CLI routes.
- Scripts that validate documentation, root Copilot surfaces, plugin surfaces,
  and bounded hook evidence.

## Product surfaces

The repository has three deliberately separate Copilot surfaces:

| Surface | Use it when | Boundary |
| --- | --- | --- |
| Root workspace | You are working in this repository and want current-directory instructions, agents, prompts, skills, hooks, and validation. | Canonical for root usage and root prompt routing. |
| [`packages/copilot-cli-plugin/`](./packages/copilot-cli-plugin/) | You want reusable installed Copilot CLI capabilities with namespaced plugin routes. | Canonical for reusable plugin agents, skills, hooks, and plugin metadata. |
| [`examples/`](./examples/) | You want small or VS Code-oriented smoke-test workspaces. | Illustrative only; nested examples are not root proof, especially for hooks. |

Root-local aliases such as `reviewer`, `verifier`, and `research` are intended
for current-directory work. Namespaced plugin agents such as
`oh-my-copilot-power-pack:reviewer` remain the reusable plugin route.

## Common workflows

### Review a docs or registration change

Use the root prompt or root agent from the repository root:

```text
/review-scope README.md
```

or ask Copilot CLI to use the `reviewer` agent. For reusable plugin testing, use
the namespaced route `oh-my-copilot-power-pack:reviewer` instead.

### Verify root surfaces before shipping

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
```

Then ask the `verifier` root agent, or run `/root-registration-check`, to review
manual Copilot smoke-test gaps.

### Install or refresh the plugin package

```bash
./scripts/bootstrap-copilot-power.sh
```

The bootstrap script checks for `copilot` and `gh`, installs the local plugin
package, checks Copilot plugin config, and runs the repository validation suite.
See [Installation](./docs/installation.md) for prerequisites and proof commands.

## Reading path

1. Start with the [quick start](./docs/quick-start.md) and
   [installation guide](./docs/installation.md).
2. Use the [usage guide](./docs/usage.md) for root agents, prompts, skills,
   plugin routes, and validation commands.
3. Read the [design spec](./docs/design-spec.md) for scope, non-goals, and the
   core Copilot-native design rule.
4. Read the [Copilot CLI capability research](./research/copilot-cli-capabilities.md)
   to see what is source-backed and what remains inference.
5. Use the [comparison matrix](./docs/comparison-matrix.md) and
   [native mapping](./docs/copilot-native-mapping.md) if you already know OMC or OMX.
6. Read the [root registration guide](./docs/root-registration.md) for the root
   workspace, reusable plugin package, and example-workspace boundary.
7. Use the [v1 blueprint](./docs/v1-repo-blueprint.md) for artifact ownership
   rules, and the [VS Code/root testing guide](./docs/vscode-copilot-testing.md)
   for smoke-test details.

## V1 scope

V1 focuses on Copilot CLI as the host because it is the GitHub Copilot surface
that most closely resembles local terminal-based Claude Code and Codex workflows:
it can plan, edit, run commands, use project guidance, delegate to agents, use
skills/hooks/MCP, and review changes from the command line.

V1 includes:

- current-source research and citations;
- product-facing quick-start, installation, usage, limitation, and release docs;
- public design docs;
- a comparison with OMC and OMX;
- a Copilot-native concept mapping;
- root workspace registration for instructions, agents, prompts, skills, and hooks;
- illustrative repository examples;
- an experimental reusable Copilot CLI plugin package; and
- lightweight documentation, root-surface, plugin-surface, and hook validation checks.

V1 does **not** include:

- custom runtime orchestration machinery;
- a tmux worker runtime;
- a replacement for Copilot CLI;
- forced feature parity with OMC or OMX;
- cloud agent, IDE, SDK, or broad multi-surface implementation; or
- executable product code beyond validation helpers and bounded hook/skill scripts.

## Design principle

Copilot-native adaptation beats lineage cloning. OMC and OMX are valuable
reference systems, but Copilot CLI has its own primitives: `AGENTS.md`,
repository and path-specific instructions, custom agents, skills, hooks, MCP,
plugins, plan/autopilot modes, and built-in review/delegation surfaces. This
repo treats those primitives as the design substrate.

## Hook and log policy

Hook and log behavior is intentionally **project-local** and stable:

- each project writes to its own `.copilot-hooks/`;
- `sessionStart` bootstraps `.copilot-hooks/config.json` only if it is missing;
- every hook run appends structured events to `.copilot-hooks/events.jsonl`;
- human-readable summaries continue to go to `.copilot-hooks/session.log` and
  `.copilot-hooks/tools.log`; and
- root workspace, plugin package, and example hook evidence must stay distinct.

This keeps logs separated across projects and avoids recreating hook config on
every session start.

## Status

Research draft created April 20, 2026. The current product direction is a small,
usable Copilot CLI-first repository: root workspace registration is the default
current-directory target, the plugin package remains the reusable distribution
surface, and examples stay illustrative smoke-test material.

## Verification

Run the lightweight checks from the repository root:

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/bootstrap-copilot-power.sh
```

For manual Copilot smoke tests, including root-vs-plugin agent routing and hook
evidence caveats, see
[docs/vscode-copilot-testing.md](./docs/vscode-copilot-testing.md).

## License

MIT. See [LICENSE](./LICENSE).
