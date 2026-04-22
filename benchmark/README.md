# oh-my-copilot Benchmark Suite

This benchmark folder is inspired by the lightweight operator loops in OMC/OMX,
but scoped to the current `oh-my-copilot` product.

It does **not** benchmark model quality in the abstract. It benchmarks whether
the current repository behaves like a usable Copilot product:

- docs validation
- root surface validation
- plugin install proof
- root/plugin smoke paths
- standalone example hook proof
- a concrete evaluation contract that distinguishes baseline (`vanilla`) proof
  from live agent-smoke (`enhanced`) proof

## Quick start

```bash
# 1. Fast baseline proof without model-backed agent prompts
./benchmark/quick_test.sh --variant vanilla

# 2. Fast enhanced proof with root/plugin reviewer prompt smoke
./benchmark/quick_test.sh --run-agent-smoke --variant enhanced

# 3. Full enhanced proof matrix
./benchmark/run_full_comparison.sh --run-agent-smoke --variant enhanced
```

## Profiles

- `quick`: validators + static proof checks
- `full`: validators + bootstrap + install-state + optional live Copilot prompt checks

## Evaluation contract

Every run now emits three artifacts:

- `<profile>_results.json` — per-check timing and output tails
- `<profile>_report.md` — human-readable summary including evidence markers
- `<profile>_evaluation.{json,md}` — scorecard + release-gate contract
- `benchmark/results/history.{jsonl,md}` — append-only local score history keyed by timestamp, branch, and git SHA

The evaluation contract is intentionally variant-aware:

- `vanilla` = baseline proof without requiring live agent-prompt markers
- `enhanced` = stronger proof that requires root/plugin prompt-smoke evidence

Current thresholds:

| Profile | Vanilla threshold | Enhanced threshold | Release-blocking meaning |
| --- | ---: | ---: | --- |
| `quick` | 90/90 | 150/150 | fail the selected proof contract |
| `full` | 85/85 | 135/135 | fail the selected proof contract |

The enhanced threshold is stricter because it requires the model-backed smoke
markers that differentiate enhanced behavior from the vanilla baseline.
The baseline floors also require the README-visible refinement ledger and
plugin-boundary review links because those are now part of the repo-owned proof
surface. They now also require those proof docs to be reachable together from
the main **Start here** path, so the benchmark checks discoverability instead of
mere file existence. Enhanced runs now also require a constrained practical
repo-task answer (`TASK_SCENARIO_OK`) so the score reflects more than route
availability. Vanilla scores now report only the vanilla contract ceiling, while
enhanced carries the extra runtime/task uplift slots. Enhanced also now requires
a second deterministic repo-work answer (`TASK_PLAN_OK`) that chooses the right
validator and public score-summary doc for benchmark-proof drift.

## Notes

- live Copilot prompt checks are opt-in through environment flags
- results are written under `benchmark/results/`
- the benchmark wrappers normalize `/.omx/team/.../worktrees/...` invocation paths
  back to the canonical repo root before recording release evidence, so team-mode
  runs do not publish transient worktree roots as the product path
- the current checked-in proof summary lives in [`docs/benchmark-status.md`](../docs/benchmark-status.md)
- `./scripts/validate-benchmark-evidence.sh` turns the checked-in baseline/enhanced snapshots into a release-blocking validation gate
- this is a proof harness for the current repo, not a broad model benchmark
