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
| [`research/`](./research/) | Evidence and source synthesis for OMC, OMX, and current Copilot CLI capabilities. |
| [`docs/design-spec.md`](./docs/design-spec.md) | Product/design specification for a Copilot-native v1. |
| [`docs/comparison-matrix.md`](./docs/comparison-matrix.md) | Side-by-side comparison of OMC, OMX, and oh-my-copilot v1. |
| [`docs/copilot-native-mapping.md`](./docs/copilot-native-mapping.md) | Mapping from OMC/OMX concepts to Copilot CLI primitives without forced parity. |
| [`docs/benchmark-status.md`](./docs/benchmark-status.md) | Current checked-in benchmark snapshot with durations, raw result links, and what the proof run actually established. |
| [`docs/root-registration.md`](./docs/root-registration.md) | Source-of-truth matrix for root workspace registration, plugin reuse, and example boundaries. |
| [`docs/v1-repo-blueprint.md`](./docs/v1-repo-blueprint.md) | Concrete repository layout and artifact roles for the public v1. |
| [`docs/vscode-copilot-testing.md`](./docs/vscode-copilot-testing.md) | How to smoke-test the root workspace and illustrative VS Code layout. |
| [`benchmark/`](./benchmark/) | Benchmark-style local proof harness for checking whether root, plugin, and example surfaces still work. |
| [`docs/release-checklist.md`](./docs/release-checklist.md) | Maintainer release gates, versioning notes, and Copilot CLI smoke-test evidence. |
| [`examples/copilot-cli-layout/`](./examples/copilot-cli-layout/) | Illustrative Copilot CLI customization layout. It is not a complete runtime. |
| [`examples/vscode-copilot-layout/`](./examples/vscode-copilot-layout/) | Stronger VS Code Copilot workspace with handoff agents, prompt files, skills, hooks, and sample files. |
| [`packages/copilot-cli-plugin/`](./packages/copilot-cli-plugin/) | Experimental local Copilot CLI plugin package with reusable agents, skills, hooks, and scripts. |
| [`docs/references.md`](./docs/references.md) | Source links and access dates for capability claims. |

## Reading path

1. Start with the [quick start](./docs/quick-start.md) and
   [installation guide](./docs/installation.md).
2. Use the [usage guide](./docs/usage.md) for root agents, prompts, skills,
   plugin routes, and validation commands.
3. Read the [benchmark status](./docs/benchmark-status.md) to see the latest
   local proof snapshot before trusting a surface claim.
4. Read the [design spec](./docs/design-spec.md) for scope, non-goals, and the
   core Copilot-native design rule.
5. Read the [Copilot CLI capability research](./research/copilot-cli-capabilities.md)
   to see what is source-backed and what remains inference.
6. Use the [comparison matrix](./docs/comparison-matrix.md) and
   [native mapping](./docs/copilot-native-mapping.md) if you already know OMC or OMX.
7. Read the [root registration guide](./docs/root-registration.md) for the root
   workspace, reusable plugin package, and example-workspace boundary.
8. Use the [v1 blueprint](./docs/v1-repo-blueprint.md) for artifact ownership
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
surface, and examples stay illustrative smoke-test material. The latest checked-
in proof run is summarized in [docs/benchmark-status.md](./docs/benchmark-status.md).

## Verification

Run the lightweight checks from the repository root:

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/validate-release-readiness.sh
./scripts/bootstrap-copilot-power.sh
```

If root-surface checks are folded into `validate-power-surfaces.sh`, the third
command is optional, but the same root instruction, agent, prompt, skill, and
hook-routing checks should still be covered.

For direct Copilot CLI smoke evidence, run:

```bash
./scripts/smoke-copilot-cli.sh
```

Use `RUN_COPILOT_AGENT_SMOKE=1 ./scripts/smoke-copilot-cli.sh` only when a
signed-in Copilot CLI session and model access are available.

For a benchmark-style local proof run, use:

```bash
./benchmark/quick_test.sh
./benchmark/run_full_comparison.sh
```

For manual Copilot smoke tests, including root-vs-plugin agent routing and hook
evidence caveats, see
[docs/vscode-copilot-testing.md](./docs/vscode-copilot-testing.md).

## License

MIT. See [LICENSE](./LICENSE).
