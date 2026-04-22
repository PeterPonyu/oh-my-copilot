# Benchmark Status

This document records the current checked-in local proof snapshot for
`oh-my-copilot`.

Snapshot refresh window: `2026-04-22T03:41:22Z` to `2026-04-22T03:46:40Z` (UTC)

Snapshot git SHA: `9ddd5f5` on `main`

Environment notes:

- local repository root: `/home/zeyufu/Desktop/oh-my-copilot`
- GitHub Copilot CLI: `1.0.34`
- reusable plugin source: `packages/copilot-cli-plugin/`
- live agent smoke enabled where noted
- benchmark wrappers normalize transient `/.omx/team/.../worktrees/...`
  invocation paths back to the canonical repo root before writing checked-in
  proof artifacts

## Current snapshot

| Run | Purpose | Result | Evaluation score | Raw output |
| --- | --- | --- | --- | --- |
| `quick-vanilla` | fast baseline proof without model-backed prompt smoke | PASS | **90/90** | [`benchmark/results/current-quick-vanilla/`](../benchmark/results/current-quick-vanilla/) |
| `quick-enhanced` | fast proof plus root/plugin reviewer prompt smoke and a constrained repo task | PASS | **150/150** | [`benchmark/results/current-quick-enhanced/`](../benchmark/results/current-quick-enhanced/) |
| `full-vanilla` | stronger end-to-end proof without live prompt-smoke markers | PASS | **85/85** | [`benchmark/results/current-full-vanilla/`](../benchmark/results/current-full-vanilla/) |
| `full-enhanced` | full proof including bootstrap, install-state, standalone hook proof, prompt smoke, and a constrained repo task | PASS | **135/135** | [`benchmark/results/current-full-enhanced/`](../benchmark/results/current-full-enhanced/) |

## Release-blocking evaluation contract

These benchmark snapshots are a **product-proof gate for Copilot CLI only**.
They are not a broad model-quality benchmark, and passing them does not imply
Cursor CLI plugin/package support or multi-runtime parity.

They are also specifically **repository-surface proof**: they verify the root
workspace, reusable plugin package, and example-related evidence boundaries in
this repo. They do not re-prove every upstream Copilot CLI capability mentioned
elsewhere in the docs.

Current thresholds:

| Profile | Vanilla threshold | Enhanced threshold | Required enhanced evidence |
| --- | ---: | ---: | --- |
| `quick` | 90/90 | 150/150 | `ROOT_AGENT_OK`, `PLUGIN_AGENT_OK`, `TASK_SCENARIO_OK`, `TASK_PLAN_OK` |
| `full` | 85/85 | 135/135 | `ROOT_AGENT_OK`, `PLUGIN_AGENT_OK`, `TASK_SCENARIO_OK`, `TASK_PLAN_OK`, `INSTALL_STATE: ok`, `source=example-workspace`, `source=plugin` |

Interpretation:

- `vanilla` now reports only the **vanilla contract ceiling** instead of mixing
  in enhanced-only runtime/task slots.
- `enhanced` is the stricter release-gating contract because it must exceed the
  vanilla floor and include the prompt/hook/install evidence markers that prove
  stronger Copilot behavior.
- The baseline floors require three repo-owned discovery layers to stay visible
  and truthful:
  - [`docs/refinement-priority-map.md`](./refinement-priority-map.md)
  - [`docs/plugin-boundary-review.md`](./plugin-boundary-review.md)
  - their placement together in the main **Start here** path
- Enhanced runs additionally require deterministic practical repo-task answers
  via `TASK_SCENARIO_OK` and `TASK_PLAN_OK`.
- A failing threshold is release-blocking for the selected benchmark variant.

`scripts/validate-benchmark-evidence.sh` enforces this contract against the
checked-in result snapshots before release and also checks that this status doc
stays synchronized with the current recorded scores and thresholds.

## What passed in the current snapshot

- docs validation stayed green in every run
- power-surface validation stayed green in every run
- root surface validation stayed green in every run
- Copilot CLI smoke checks passed in every run
- root reviewer prompt smoke returned `ROOT_AGENT_OK`
- namespaced plugin reviewer prompt smoke returned `PLUGIN_AGENT_OK`
- constrained repo-task smoke returned `TASK_SCENARIO_OK`
- benchmark-proof drift smoke returned `TASK_PLAN_OK`
- install-state proof returned `INSTALL_STATE: ok`
- standalone hook proof logged both `source=example-workspace` and
  `source=plugin`
- the README exposes both the refinement-priority map and the
  plugin-boundary review as benchmarked repo-owned discovery points
- the benchmark proves those docs remain reachable together from the
  main **Start here** reading path instead of only existing somewhere in the repo
- checked-in reports continue to record the canonical repo root instead of
  transient OMX team worktree paths

## What this proves today

The current repo is more than a static layout:

- root `AGENTS.md`, prompt, skill, and hook registration are discoverable
- the reusable plugin package is installed and routed separately from root-local
  aliases
- the refinement-priority map and plugin-boundary review are visible as
  repository-owned guidance, not hidden implementation notes
- benchmark-style proof runs can catch regressions in root routing, plugin
  installation, hook evidence, discoverability of shipped proof docs, and a
  small deterministic practical repo-task answer
- the checked-in proof is still intentionally Copilot CLI-only rather than a
  cross-host OMC/OMX/Cursor benchmark

This is still a product proof harness, not a broad benchmark of model quality or
an OMC/OMX runtime parity claim. It should also not be read as proof that this
repository implements Copilot CLI plan/autopilot/delegation behavior; those are
upstream host-product capabilities documented separately.

## Improvement summaries from the current runs

- `quick-vanilla`: vanilla contract established at **90/90**
- `quick-enhanced`: improved by **60** over the vanilla floor; benchmark-backed
  uplift observed
- `full-vanilla`: vanilla contract established at **85/85**
- `full-enhanced`: improved by **50** over the vanilla floor; benchmark-backed
  uplift observed

## State-management note

Benchmark scoring is complemented by a separate local state-contract gate:

- `./scripts/check-install-state.sh`
- `./scripts/validate-copilot-state-contract.sh`

That extra gate exists because plugin source-path drift (for example toward a
transient `.omx/team/...` worktree) is a state bug, not just a benchmark miss.

## Remaining gaps

- external link validation is still skipped unless `CHECK_EXTERNAL=1`
- live prompt smoke depends on a signed-in Copilot CLI session with model access
- the practical task layer is still deterministic and narrow; it does not yet
  measure broader multi-step task quality
- VS Code extension behavior outside the local smoke workspace still benefits
  from manual checks alongside this benchmark harness
- any future Cursor comparison should be recorded as sibling/cross-host evidence,
  not folded into this Copilot-only benchmark snapshot without an approved plan
