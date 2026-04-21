#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'USAGE'
Usage: scripts/validate-benchmark-evidence.sh [--root PATH]

Validates the checked-in benchmark evidence contract:
  - benchmark status doc defines the release-blocking score thresholds
  - referenced quick/full proof artifacts exist
  - baseline, prompt-enabled, and full proof snapshots meet their PASS thresholds
  - prompt-enabled outputs contain the expected root/plugin smoke evidence
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

latest_result_file() {
  local prefix="$1"
  local filename="$2"
  python3 - "$ROOT" "$prefix" "$filename" <<'PY'
from __future__ import annotations
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
prefix = sys.argv[2]
filename = sys.argv[3]
results_root = root / "benchmark" / "results"
matches = sorted(
    path for path in results_root.glob(f"{prefix}-*/{filename}") if path.is_file()
)
if not matches:
    raise SystemExit("")
print(matches[-1].relative_to(root).as_posix())
PY
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

BASELINE_RESULTS="$(latest_result_file quick-baseline quick_results.json)"
ENHANCED_RESULTS="$(latest_result_file quick-agent-smoke quick_results.json)"
FULL_RESULTS="$(latest_result_file full-agent-smoke full_results.json)"

[[ -n "$BASELINE_RESULTS" ]] || fail "missing quick-baseline results under benchmark/results/"
[[ -n "$ENHANCED_RESULTS" ]] || fail "missing quick-agent-smoke results under benchmark/results/"
[[ -n "$FULL_RESULTS" ]] || fail "missing full-agent-smoke results under benchmark/results/"

require_file "$BASELINE_RESULTS"
require_file "$ENHANCED_RESULTS"
require_file "$FULL_RESULTS"

require_contains "benchmark status documents release-blocking evaluation contract" '^## Release-blocking evaluation contract$' docs/benchmark-status.md
require_contains "benchmark status keeps Copilot CLI-first boundary" 'Copilot CLI' docs/benchmark-status.md
require_contains "benchmark status rejects Cursor plugin/package overclaims" 'Cursor CLI plugin/package support' docs/benchmark-status.md
require_contains "benchmark snapshot table includes evidence score" 'Evidence score' docs/benchmark-status.md
require_contains "benchmark status records canonical root normalization for team worktrees" 'canonical repo root|team worktree paths' docs/benchmark-status.md

python3 - "$ROOT" "$BASELINE_RESULTS" "$ENHANCED_RESULTS" "$FULL_RESULTS" <<'PY'
from __future__ import annotations
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
baseline_rel = sys.argv[2]
enhanced_rel = sys.argv[3]
full_rel = sys.argv[4]


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


def check_all_pass(rel: str, expected_count: int, label: str):
    path, data = load_results(rel)
    if len(data) != expected_count:
        fail(f"{label} expected {expected_count} checks but found {len(data)} in {path}")
    failed = [entry.get("name", "<unknown>") for entry in data if not entry.get("success")]
    if failed:
        fail(f"{label} has failing checks: {', '.join(failed)}")
    ok(f"{label} score {expected_count}/{expected_count} meets release threshold")
    return {entry["name"]: entry for entry in data}

baseline = check_all_pass(
    baseline_rel,
    4,
    "quick-baseline",
)
enhanced = check_all_pass(
    enhanced_rel,
    4,
    "quick-agent-smoke",
)
full = check_all_pass(
    full_rel,
    7,
    "full-agent-smoke",
)

smoke_tail = enhanced["smoke_cli"].get("output_tail", "")
for token in ("ROOT_AGENT_OK", "PLUGIN_AGENT_OK"):
    if token not in smoke_tail:
        fail(f"quick-agent-smoke is missing {token} evidence")
ok("quick-agent-smoke proves both root and namespaced plugin reviewer routes")

install_tail = full["install_state"].get("output_tail", "")
if "INSTALL_STATE: ok" not in install_tail:
    fail("full-agent-smoke is missing INSTALL_STATE: ok evidence")
ok("full-agent-smoke includes install-state evidence")

hook_tail = full["standalone_hook_proof"].get("output_tail", "")
if "standalone workspace hook proof succeeded" not in hook_tail:
    fail("full-agent-smoke is missing standalone hook success evidence")
ok("full-agent-smoke includes standalone hook proof evidence")
PY

(cd "$ROOT" && python3 ./scripts/validate-cross-host-benchmark-data.py --app-root ./apps/cross-host-benchmark-site)

log "benchmark evidence validation complete"
