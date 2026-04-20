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

## Quick start

```bash
# 1. Fast local proof
./benchmark/quick_test.sh

# 2. Full local proof matrix
./benchmark/run_full_comparison.sh
```

## Profiles

- `quick`: validators + static proof checks
- `full`: validators + bootstrap + install-state + optional live Copilot prompt checks

## Notes

- live Copilot prompt checks are opt-in through environment flags
- results are written under `benchmark/results/`
- the current checked-in proof summary lives in [`docs/benchmark-status.md`](../docs/benchmark-status.md)
- this is a proof harness for the current repo, not a broad model benchmark
