# Benchmark Status

This document records the current checked-in local proof snapshot for
`oh-my-copilot`.

Snapshot run timestamp: `2026-04-20T16:19:03Z` (UTC)

Environment notes:

- local repository root: `/home/zeyufu/Desktop/oh-my-copilot`
- GitHub Copilot CLI: `1.0.32`
- reusable plugin source: `packages/copilot-cli-plugin/`
- live agent smoke enabled where noted

## Current snapshot

| Run | Purpose | Total duration (s) | Result | Raw output |
| --- | --- | ---: | --- | --- |
| `quick-baseline` | fast validation without model-backed agent prompts | 1.92 | PASS | [`benchmark/results/quick-baseline-20260420T161903Z/`](../benchmark/results/quick-baseline-20260420T161903Z/) |
| `quick-agent-smoke` | fast validation plus root/plugin reviewer prompt smoke | 39.45 | PASS | [`benchmark/results/quick-agent-smoke-20260420T161903Z/`](../benchmark/results/quick-agent-smoke-20260420T161903Z/) |
| `full-agent-smoke` | full proof including bootstrap, install-state, and standalone hook proof | 127.83 | PASS | [`benchmark/results/full-agent-smoke-20260420T161903Z/`](../benchmark/results/full-agent-smoke-20260420T161903Z/) |

## What passed

- docs validation stayed green in every run
- root surface validation stayed green in every run
- Copilot CLI smoke checks passed in every run
- root reviewer prompt smoke returned `ROOT_AGENT_OK`
- namespaced plugin reviewer prompt smoke returned `PLUGIN_AGENT_OK`
- install-state proof returned `INSTALL_STATE: ok`
- standalone hook proof logged both `source=example-workspace` and
  `source=plugin`
- fresh reports no longer include the prior `datetime.utcnow()` deprecation
  warning

## What this proves today

The current repo is more than a static layout:

- root `AGENTS.md`, prompt, skill, and hook registration are discoverable
- the reusable plugin package is installed and routed separately from root-local
  aliases
- benchmark-style proof runs can catch regressions in root routing, plugin
  installation, and hook evidence

This is still a product proof harness, not a broad benchmark of model quality or
an OMC/OMX runtime parity claim.

## Remaining gaps

- external link validation is still skipped unless `CHECK_EXTERNAL=1`
- live prompt smoke depends on a signed-in Copilot CLI session with model access
- VS Code extension behavior outside the local smoke workspace still benefits
  from manual checks alongside this benchmark harness
