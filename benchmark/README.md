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
| `quick` | 60/100 | 100/100 | fail the selected proof contract |
| `full` | 70/100 | 100/100 | fail the selected proof contract |

The enhanced threshold is stricter because it requires the model-backed smoke
markers that differentiate enhanced behavior from the vanilla baseline.

## Notes

- live Copilot prompt checks are opt-in through environment flags
- results are written under `benchmark/results/`
- the current checked-in proof summary lives in [`docs/benchmark-status.md`](../docs/benchmark-status.md)
- `./scripts/validate-benchmark-evidence.sh` turns the checked-in baseline/enhanced snapshots into a release-blocking validation gate
- this is a proof harness for the current repo, not a broad model benchmark
