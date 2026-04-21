# Benchmark Status

This document records the current checked-in local proof snapshot for
`oh-my-copilot`.

Snapshot run timestamp: `2026-04-21T07:49:37Z` (UTC)

Environment notes:

- local repository root: `/home/zeyufu/Desktop/oh-my-copilot`
- GitHub Copilot CLI: `1.0.34`
- reusable plugin source: `packages/copilot-cli-plugin/`
- live agent smoke enabled where noted
- benchmark wrappers normalize transient `/.omx/team/.../worktrees/...`
  invocation paths back to the canonical repo root before writing checked-in
  proof artifacts

## Current snapshot

| Run | Purpose | Total duration (s) | Result | Evidence score | Raw output |
| --- | --- | ---: | --- | --- | --- |
| `quick-baseline` | fast validation without model-backed agent prompts | 1.90 | PASS | 4/4 required checks (100%) | [`benchmark/results/quick-baseline-20260421T074937Z/`](../benchmark/results/quick-baseline-20260421T074937Z/) |
| `quick-agent-smoke` | fast validation plus root/plugin reviewer prompt smoke | 24.96 | PASS | 4/4 required checks (100%) + `ROOT_AGENT_OK` + `PLUGIN_AGENT_OK` | [`benchmark/results/quick-agent-smoke-20260421T074937Z/`](../benchmark/results/quick-agent-smoke-20260421T074937Z/) |
| `full-agent-smoke` | full proof including bootstrap, install-state, and standalone hook proof | 57.88 | PASS | 7/7 required checks (100%) + install/hook evidence | [`benchmark/results/full-agent-smoke-20260421T074937Z/`](../benchmark/results/full-agent-smoke-20260421T074937Z/) |

## Release-blocking evaluation contract

These benchmark snapshots are a **product-proof gate for Copilot CLI only**.
They are not a broad model-quality benchmark, and passing them does not imply
Cursor CLI plugin/package support or multi-runtime parity.

They are also specifically **repository-surface proof**: they verify the root
workspace, reusable plugin package, and example-related evidence boundaries in
this repo. They do not re-prove every upstream Copilot CLI capability mentioned
elsewhere in the docs.

- **Baseline gate (`quick-baseline`)**: `docs_validation`,
  `power_validation`, `root_validation`, and `smoke_cli` must all pass.
  Release-blocking threshold: **4/4 required checks = 100%**.
- **Enhanced prompt gate (`quick-agent-smoke`)**: the same four checks must
  pass, and `smoke_cli` must include both `ROOT_AGENT_OK` and
  `PLUGIN_AGENT_OK` to prove root and namespaced plugin reviewer routing.
  Release-blocking threshold: **4/4 required checks = 100% plus both prompt
  tokens**.
- **Enhanced end-to-end gate (`full-agent-smoke`)**: all seven checks must
  pass, `install_state` must include `INSTALL_STATE: ok`, and
  `standalone_hook_proof` must confirm standalone hook success. Release-
  blocking threshold: **7/7 required checks = 100% plus install/hook proof**.

`scripts/validate-benchmark-evidence.sh` enforces this contract against the
checked-in result snapshots before release.

## Claim boundary for this benchmark

- What this benchmark can prove: root/plugin/example routing, validator output,
  install-state behavior, and source-labelled hook evidence captured by this
  repository.
- What this benchmark cannot prove by itself: broad model quality, cross-host
  support, or upstream Copilot CLI host-product features such as plan mode,
  autopilot mode, or built-in delegation.
- For host-product capability claims, use the GitHub sources collected in
  [`docs/references.md`](./references.md) in addition to any local smoke notes.

## Evaluation contract (current policy)

Benchmark runs are now expected to produce both timing output and an evaluation
contract so the suite can distinguish `vanilla` proof from `enhanced` proof.

| Profile | Vanilla threshold | Enhanced threshold | Required enhanced evidence |
| --- | ---: | ---: | --- |
| `quick` | 60/100 | 100/100 | `ROOT_AGENT_OK`, `PLUGIN_AGENT_OK` |
| `full` | 70/100 | 100/100 | `ROOT_AGENT_OK`, `PLUGIN_AGENT_OK`, `INSTALL_STATE: ok`, `source=example-workspace`, `source=plugin` |

Interpretation:

- `vanilla` keeps the baseline validators/smoke path measurable without
  requiring live prompt-smoke evidence.
- `enhanced` is the stricter release-gating contract because it must exceed the
  vanilla floor and include the prompt/hook/install evidence markers that prove
  stronger Copilot behavior.
- A failing threshold is release-blocking for the selected benchmark variant.

## What passed

- docs validation stayed green in every run
- root surface validation stayed green in every run
- Copilot CLI smoke checks passed in every run
- root reviewer prompt smoke returned `ROOT_AGENT_OK`
- namespaced plugin reviewer prompt smoke returned `PLUGIN_AGENT_OK`
- install-state proof returned `INSTALL_STATE: ok`
- standalone hook proof logged both `source=example-workspace` and
  `source=plugin`
- docs validation now ignores vendored `node_modules/` markdown so local site
  installs do not create false benchmark failures
- checked-in reports now record the canonical repo root instead of transient OMX
  team worktree paths

## What this proves today

The current repo is more than a static layout:

- root `AGENTS.md`, prompt, skill, and hook registration are discoverable
- the reusable plugin package is installed and routed separately from root-local
  aliases
- benchmark-style proof runs can catch regressions in root routing, plugin
  installation, and hook evidence
- the checked-in proof is still intentionally Copilot CLI-only rather than a
  cross-host OMC/OMX/Cursor benchmark

This is still a product proof harness, not a broad benchmark of model quality or
an OMC/OMX runtime parity claim. It should also not be read as proof that this
repository implements Copilot CLI plan/autopilot/delegation behavior; those are
upstream host-product capabilities documented separately.

## State-management note

Benchmark scoring is complemented by a separate local state-contract gate:

- `./scripts/check-install-state.sh`
- `./scripts/validate-copilot-state-contract.sh`

That extra gate exists because plugin source-path drift (for example toward a
transient `.omx/team/...` worktree) is a state bug, not just a benchmark miss.

## Remaining gaps

- external link validation is still skipped unless `CHECK_EXTERNAL=1`
- live prompt smoke depends on a signed-in Copilot CLI session with model access
- VS Code extension behavior outside the local smoke workspace still benefits
  from manual checks alongside this benchmark harness
- any future Cursor comparison should be recorded as sibling/cross-host evidence,
  not folded into this Copilot-only benchmark snapshot without an approved plan
