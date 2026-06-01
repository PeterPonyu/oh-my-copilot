#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat <<'USAGE'
Usage: scripts/validate-fast-sanity.sh [--root PATH]

Fast deterministic oh-my-copilot sanity gate. It avoids live Copilot/model calls
and checks shell syntax, mirror drift, plugin orchestration metadata, README
surface counts, docs links, root Copilot surfaces, and the structural E2E fixture.
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

find scripts packages/copilot-cli-plugin/scripts tools/omc-port -type f -name '*.sh' -print0 \
  | sort -z \
  | xargs -0 -r -n 1 bash -n
log "shell validators parse with bash -n"

./scripts/check-mirror-drift.sh
node scripts/validate-plugin-orchestration.mjs
node scripts/validate-readme-counts.mjs
./scripts/validate-doc-links.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/validate-structural-e2e.sh

if [[ -x tools/omc-port/translator-smoke.sh ]]; then
  ./tools/omc-port/translator-smoke.sh
  log "translator fixture smoke passes"
else
  log "translator fixture smoke skipped (script absent)"
fi

log "fast sanity validation complete"
