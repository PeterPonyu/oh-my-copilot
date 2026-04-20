# oh-my-copilot

`oh-my-copilot` is a public research repository for adapting the lessons of
[`oh-my-claudecode`](./research/omc-analysis.md) and
[`oh-my-codex`](./research/omx-analysis.md) to **GitHub Copilot CLI**.

V1 is intentionally **Copilot CLI-first** and **docs/research-first**. It is not
a runtime framework, not an OMC/OMX parity clone, and not a claim that Copilot
cloud agent, IDE integrations, or SDK runtimes should share one design.

## What this repo contains

| Area | Purpose |
| --- | --- |
| [`research/`](./research/) | Evidence and source synthesis for OMC, OMX, and current Copilot CLI capabilities. |
| [`docs/design-spec.md`](./docs/design-spec.md) | Product/design specification for a Copilot-native v1. |
| [`docs/comparison-matrix.md`](./docs/comparison-matrix.md) | Side-by-side comparison of OMC, OMX, and oh-my-copilot v1. |
| [`docs/copilot-native-mapping.md`](./docs/copilot-native-mapping.md) | Mapping from OMC/OMX concepts to Copilot CLI primitives without forced parity. |
| [`docs/root-registration.md`](./docs/root-registration.md) | Source-of-truth matrix for root workspace registration, plugin reuse, and example boundaries. |
| [`docs/v1-repo-blueprint.md`](./docs/v1-repo-blueprint.md) | Concrete repository layout and artifact roles for the public v1. |
| [`docs/vscode-copilot-testing.md`](./docs/vscode-copilot-testing.md) | How to smoke-test the root workspace and illustrative VS Code layout. |
| [`examples/copilot-cli-layout/`](./examples/copilot-cli-layout/) | Illustrative Copilot CLI customization layout. It is not a complete runtime. |
| [`examples/vscode-copilot-layout/`](./examples/vscode-copilot-layout/) | Stronger VS Code Copilot workspace with handoff agents, prompt files, skills, hooks, and sample files. |
| [`packages/copilot-cli-plugin/`](./packages/copilot-cli-plugin/) | Experimental local Copilot CLI plugin package with reusable agents, skills, hooks, and scripts. |
| [`docs/references.md`](./docs/references.md) | Source links and access dates for capability claims. |

## Reading path

1. Start with the [design spec](./docs/design-spec.md) for scope, non-goals, and
   the core Copilot-native design rule.
2. Read the [Copilot CLI capability research](./research/copilot-cli-capabilities.md)
   to see what is source-backed and what remains inference.
3. Use the [comparison matrix](./docs/comparison-matrix.md) and
   [native mapping](./docs/copilot-native-mapping.md) if you already know OMC or OMX.
4. Read the [root registration guide](./docs/root-registration.md) to understand
   the root workspace, reusable plugin package, and example-workspace boundary.
5. Use the [v1 blueprint](./docs/v1-repo-blueprint.md) for the concrete file
   layout and artifact ownership rules.
6. If you want to test Copilot behavior, follow the
   [VS Code and root testing guide](./docs/vscode-copilot-testing.md).

## V1 scope

V1 focuses on Copilot CLI as the host because it is the GitHub Copilot surface
that most closely resembles local terminal-based Claude Code and Codex workflows:
it can plan, edit, run commands, use project guidance, delegate to agents, use
skills/hooks/MCP, and review changes from the command line.

V1 includes:

- current-source research and citations;
- public design docs;
- a comparison with OMC and OMX;
- a Copilot-native concept mapping;
- root workspace registration for instructions, agents, prompts, skills, and hooks;
- illustrative repository examples;
- an experimental reusable Copilot CLI plugin package; and
- lightweight documentation and surface validation checks.

V1 does **not** include:

- custom runtime orchestration machinery;
- a tmux worker runtime;
- a replacement for Copilot CLI;
- forced feature parity with OMC or OMX;
- cloud agent, IDE, SDK, or multi-surface implementation; or
- executable product code beyond validation helpers and bounded hook/skill scripts.

## Design principle

Copilot-native adaptation beats lineage cloning. OMC and OMX are valuable
reference systems, but Copilot CLI has its own primitives: `AGENTS.md`,
repository and path-specific instructions, custom agents, skills, hooks, MCP,
plugins, plan/autopilot modes, and built-in review/delegation surfaces. This
repo treats those primitives as the design substrate.

## Current power surfaces

The repository has three deliberately separate Copilot surfaces:

| Surface | Use it when | Boundary |
| --- | --- | --- |
| Root workspace | You are working in the repository root and want root-local instructions, agents, prompts, skills, and hook evidence. | Recommended current-directory target; root prompt routing and root docs are canonical here. |
| [`packages/copilot-cli-plugin/`](./packages/copilot-cli-plugin/) | You want reusable installed Copilot CLI capabilities with namespaced plugin routes. | Canonical for reusable plugin agents, skills, hooks, and plugin metadata. |
| [`examples/`](./examples/) | You want small or VS Code-oriented smoke-test workspaces. | Illustrative only; nested examples are not root proof, especially for hooks. |

Root-local aliases such as `reviewer`, `verifier`, and `research` are intended
for current-directory work. Namespaced plugin agents such as
`oh-my-copilot-power-pack:reviewer` remain the distinct reusable plugin route.

These surfaces increase actual Copilot leverage without pretending the project
already ships a full OMC/OMX-style runtime.

## Hook and log policy

Hook and log behavior is intentionally **project-local** and stable:

- each project writes to its own `.copilot-hooks/`
- `sessionStart` bootstraps `.copilot-hooks/config.json` only if it is missing
- every hook run appends structured events to `.copilot-hooks/events.jsonl`
- human-readable summaries continue to go to `.copilot-hooks/session.log` and
  `.copilot-hooks/tools.log`

This keeps logs separated across projects and avoids recreating hook config on
every session start.

## Status

Research draft created April 20, 2026. Root registration is the current v1
workspace direction: the repo root is the recommended current-directory target,
the plugin package remains the reusable distribution surface, and examples stay
illustrative smoke-test material.

## Verification

Run the lightweight docs and surface checks from the repository root:

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/bootstrap-copilot-power.sh
```

If root-surface checks are folded into `validate-power-surfaces.sh`, the third
command is optional, but the same root instruction, agent, prompt, skill, and
hook-routing checks should still be covered.

For manual Copilot smoke tests, including root-vs-plugin agent routing and hook
evidence caveats, see
[docs/vscode-copilot-testing.md](./docs/vscode-copilot-testing.md).

## License

MIT. See [LICENSE](./LICENSE).
