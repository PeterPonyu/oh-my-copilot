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
| [`docs/v1-repo-blueprint.md`](./docs/v1-repo-blueprint.md) | Concrete repository layout and artifact roles for the public v1. |
| [`examples/copilot-cli-layout/`](./examples/copilot-cli-layout/) | Illustrative Copilot CLI customization layout. It is not a complete runtime. |
| [`docs/references.md`](./docs/references.md) | Source links and access dates for capability claims. |

## Reading path

1. Start with the [design spec](./docs/design-spec.md) for scope, non-goals, and
   the core Copilot-native design rule.
2. Read the [Copilot CLI capability research](./research/copilot-cli-capabilities.md)
   to see what is source-backed and what remains inference.
3. Use the [comparison matrix](./docs/comparison-matrix.md) and
   [native mapping](./docs/copilot-native-mapping.md) if you already know OMC or OMX.
4. Use the [v1 blueprint](./docs/v1-repo-blueprint.md) and
   [example layout](./examples/copilot-cli-layout/) for a future implementation sketch.

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
- illustrative repository examples; and
- lightweight documentation hygiene checks.

V1 does **not** include:

- custom runtime orchestration machinery;
- a tmux worker runtime;
- a replacement for Copilot CLI;
- forced feature parity with OMC or OMX;
- cloud agent, IDE, SDK, or multi-surface implementation; or
- executable product code beyond documentation hygiene scripts.

## Design principle

Copilot-native adaptation beats lineage cloning. OMC and OMX are valuable
reference systems, but Copilot CLI has its own primitives: `AGENTS.md`,
repository and path-specific instructions, custom agents, skills, hooks, MCP,
plugins, plan/autopilot modes, and built-in review/delegation surfaces. This
repo treats those primitives as the design substrate.

## Status

Research draft created April 20, 2026. Examples are illustrative until exercised
in a real Copilot CLI session and updated with verification notes.

## Verification

Run the lightweight docs checks:

```bash
./scripts/validate-doc-links.sh
```

The script validates internal Markdown links and checks that external reference
URLs are syntactically present. It intentionally avoids product runtime behavior.

## License

MIT. See [LICENSE](./LICENSE).
