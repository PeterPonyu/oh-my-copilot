#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'USAGE'
Usage: scripts/validate-benchmark-evidence.sh [--root PATH]

Validates the checked-in benchmark evidence contract:
  - benchmark status doc stays synced with the current quick/full proof snapshots
  - current quick/full proof artifacts exist
  - vanilla/enhanced quick+full snapshots meet their PASS thresholds
  - prompt-enabled outputs contain the expected root/plugin smoke evidence
  - repo-owned README discovery points are actually benchmarked
  - full proof outputs contain install-state and standalone hook evidence
  - cross-host benchmark harvest data preserves truthful comparability metadata
USAGE
}

log() { printf 'ok: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

while (($#)); do
  case "$1" in
    --root)
      [[ $# -ge 2 ]] || fail "--root requires a path"
      ROOT="$(cd "$2" && pwd)"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

require_file() {
  [[ -f "$ROOT/$1" ]] || fail "missing required file: $1"
}

require_contains() {
  local description="$1"
  local pattern="$2"
  shift 2
  (cd "$ROOT" && grep -Eq -- "$pattern" "$@") || fail "$description"
  log "$description"
}

require_file docs/benchmark-status.md
require_file scripts/validate-cross-host-benchmark-data.py

QUICK_VANILLA_RESULTS="benchmark/results/current-quick-vanilla/quick_results.json"
QUICK_VANILLA_EVAL="benchmark/results/current-quick-vanilla/quick_evaluation.json"
QUICK_ENHANCED_RESULTS="benchmark/results/current-quick-enhanced/quick_results.json"
QUICK_ENHANCED_EVAL="benchmark/results/current-quick-enhanced/quick_evaluation.json"
FULL_VANILLA_RESULTS="benchmark/results/current-full-vanilla/full_results.json"
FULL_VANILLA_EVAL="benchmark/results/current-full-vanilla/full_evaluation.json"
FULL_ENHANCED_RESULTS="benchmark/results/current-full-enhanced/full_results.json"
FULL_ENHANCED_EVAL="benchmark/results/current-full-enhanced/full_evaluation.json"

for path in \
  "$QUICK_VANILLA_RESULTS" "$QUICK_VANILLA_EVAL" \
  "$QUICK_ENHANCED_RESULTS" "$QUICK_ENHANCED_EVAL" \
  "$FULL_VANILLA_RESULTS" "$FULL_VANILLA_EVAL" \
  "$FULL_ENHANCED_RESULTS" "$FULL_ENHANCED_EVAL"
do
  require_file "$path"
done

require_contains "benchmark status documents release-blocking evaluation contract" '^## Release-blocking evaluation contract$' docs/benchmark-status.md
require_contains "benchmark status keeps Copilot CLI-first boundary" 'Copilot CLI' docs/benchmark-status.md
require_contains "benchmark status rejects Cursor plugin/package overclaims" 'Cursor CLI plugin/package support' docs/benchmark-status.md
require_contains "benchmark status records canonical root normalization for team worktrees" 'canonical repo root|team worktree paths' docs/benchmark-status.md
require_contains "benchmark status mentions refinement-priority map visibility" 'refinement-priority-map' docs/benchmark-status.md
require_contains "benchmark status mentions plugin-boundary review visibility" 'plugin-boundary-review' docs/benchmark-status.md

python3 - \
  "$ROOT" \
  "$QUICK_VANILLA_RESULTS" "$QUICK_VANILLA_EVAL" \
  "$QUICK_ENHANCED_RESULTS" "$QUICK_ENHANCED_EVAL" \
  "$FULL_VANILLA_RESULTS" "$FULL_VANILLA_EVAL" \
  "$FULL_ENHANCED_RESULTS" "$FULL_ENHANCED_EVAL" <<'PY'
from __future__ import annotations
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
quick_vanilla_results_rel = sys.argv[2]
quick_vanilla_eval_rel = sys.argv[3]
quick_enhanced_results_rel = sys.argv[4]
quick_enhanced_eval_rel = sys.argv[5]
full_vanilla_results_rel = sys.argv[6]
full_vanilla_eval_rel = sys.argv[7]
full_enhanced_results_rel = sys.argv[8]
full_enhanced_eval_rel = sys.argv[9]
benchmark_status = (root / "docs" / "benchmark-status.md").read_text(encoding="utf-8")


def fail(msg: str) -> None:
    raise SystemExit(f"FAIL: {msg}")


def ok(msg: str) -> None:
    print(f"ok: {msg}")


def load_results(rel: str):
    path = root / rel
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"could not read {rel}: {exc}")
    if not isinstance(data, list) or not data:
        fail(f"{rel} must contain a non-empty list of checks")
    return path, data


def load_eval(rel: str):
    path = root / rel
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"could not read {rel}: {exc}")
    if not isinstance(data, dict):
        fail(f"{rel} must contain an object")
    return path, data


def check_all_pass(results_rel: str, eval_rel: str, expected_count: int, label: str):
    path, data = load_results(results_rel)
    if len(data) != expected_count:
        fail(f"{label} expected {expected_count} checks but found {len(data)} in {path}")
    failed = [entry.get("name", "<unknown>") for entry in data if not entry.get("success")]
    if failed:
        fail(f"{label} has failing checks: {', '.join(failed)}")
    _, evaluation = load_eval(eval_rel)
    if not evaluation.get("passed"):
        fail(f"{label} evaluation is not passing in {eval_rel}")
    ok(f"{label} contract score {evaluation['score']}/{evaluation['max_score']} meets release threshold {evaluation['threshold_score']}/{evaluation['max_score']}")
    return {entry["name"]: entry for entry in data}, evaluation


quick_vanilla, quick_vanilla_eval = check_all_pass(
    quick_vanilla_results_rel,
    quick_vanilla_eval_rel,
    4,
    "quick-vanilla",
)
quick_enhanced, quick_enhanced_eval = check_all_pass(
    quick_enhanced_results_rel,
    quick_enhanced_eval_rel,
    4,
    "quick-enhanced",
)
full_vanilla, full_vanilla_eval = check_all_pass(
    full_vanilla_results_rel,
    full_vanilla_eval_rel,
    7,
    "full-vanilla",
)
full_enhanced, full_enhanced_eval = check_all_pass(
    full_enhanced_results_rel,
    full_enhanced_eval_rel,
    7,
    "full-enhanced",
)

smoke_tail = quick_enhanced["smoke_cli"].get("output_tail", "")
for token in ("ROOT_AGENT_OK", "PLUGIN_AGENT_OK", "TASK_SCENARIO_OK", "TASK_PLAN_OK", "TASK_COMMAND_OK"):
    if token not in smoke_tail:
        fail(f"quick-enhanced is missing {token} evidence")
ok("quick-enhanced proves root/plugin reviewer routes plus constrained repo-task answers")

power_tail = quick_vanilla["power_validation"].get("output_tail", "")
for token in ("REFINEMENT_MAP_OK", "PLUGIN_BOUNDARY_OK"):
    if token not in power_tail:
        fail(f"quick-vanilla is missing {token} evidence in power_validation")
ok("quick/full baseline proof now measures the shipped refinement and plugin-boundary docs")

install_tail = full_enhanced["install_state"].get("output_tail", "")
if "INSTALL_STATE: ok" not in install_tail:
    fail("full-enhanced is missing INSTALL_STATE: ok evidence")
ok("full-enhanced includes install-state evidence")

hook_tail = full_enhanced["standalone_hook_proof"].get("output_tail", "")
if "standalone workspace hook proof succeeded" not in hook_tail:
    fail("full-enhanced is missing standalone hook success evidence")
ok("full-enhanced includes standalone hook proof evidence")

expected_doc_snippets = [
    f"**{quick_vanilla_eval['score']}/{quick_vanilla_eval['max_score']}**",
    f"**{quick_enhanced_eval['score']}/{quick_enhanced_eval['max_score']}**",
    f"**{full_vanilla_eval['score']}/{full_vanilla_eval['max_score']}**",
    f"**{full_enhanced_eval['score']}/{full_enhanced_eval['max_score']}**",
    f"| `quick` | {quick_vanilla_eval['threshold_score']}/{quick_vanilla_eval['threshold_score']} | {quick_enhanced_eval['threshold_score']}/{quick_enhanced_eval['max_score']} |",
    f"| `full` | {full_vanilla_eval['threshold_score']}/{full_vanilla_eval['threshold_score']} | {full_enhanced_eval['threshold_score']}/{full_enhanced_eval['max_score']} |",
]
for snippet in expected_doc_snippets:
    if snippet not in benchmark_status:
        fail(f"docs/benchmark-status.md is missing current evidence snippet: {snippet}")
ok("benchmark-status.md matches the current recorded quick/full scores and thresholds")
PY

(cd "$ROOT" && python3 ./scripts/validate-cross-host-benchmark-data.py --app-root ./apps/cross-host-benchmark-site)

log "benchmark evidence validation complete"
