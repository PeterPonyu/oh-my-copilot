#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_RELEASE_READINESS=1

usage() {
  cat <<'USAGE'
Usage: scripts/validate-full-local.sh [--root PATH] [--skip-release-readiness]

Full credential-free local verification gate for oh-my-copilot. It layers the
fast sanity gate with power/release/state/benchmark validators, Node syntax
checks, MCP server tests, benchmark unit tests, and cross-host data tests.
Live Copilot/model smoke remains excluded by default.
USAGE
}

log() { printf 'ok: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

while (($#)); do
  case "$1" in
    --root)
      [[ $# -ge 2 ]] || fail "--root requires a path"
      ROOT="$2"
      shift 2
      ;;
    --skip-release-readiness)
      RUN_RELEASE_READINESS=0
      shift
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

ROOT="$(cd "$ROOT" && pwd)"
cd "$ROOT"

./scripts/validate-fast-sanity.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-pages-surface.sh
./scripts/validate-copilot-state-contract.sh
./scripts/validate-benchmark-evidence.sh
node scripts/validate-cross-host-benchmark-data.mjs --app-root ./apps/cross-host-benchmark-site
node scripts/audit-tool-refs.mjs
node scripts/validate-surface-inventory.mjs

for script in \
  scripts/validate-plugin-orchestration.mjs \
  scripts/validate-readme-counts.mjs \
  scripts/validate-surface-inventory.mjs \
  scripts/harvest-cross-host-benchmark-data.mjs \
  scripts/validate-cross-host-benchmark-data.mjs
 do
  node --check "$script"
done
log "Node validator syntax checks pass"

node --test scripts/tests/harvest-cross-host-benchmark-data.test.mjs
node --test scripts/tests/validate-cross-host-benchmark-data.test.mjs
python3 -m unittest discover -s benchmark -p 'test*.py'

(
  cd packages/copilot-cli-plugin/mcp-server
  npm test
)

if [[ "$RUN_RELEASE_READINESS" == "1" ]]; then
  ./scripts/validate-release-readiness.sh --skip-copilot-smoke
else
  log "release readiness skipped by flag"
fi

log "full local validation complete"
