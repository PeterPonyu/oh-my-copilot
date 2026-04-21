#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_COPILOT_SMOKE="${RUN_COPILOT_SMOKE:-1}"

usage() {
  cat <<'USAGE'
Usage: scripts/validate-release-readiness.sh [--root PATH] [--skip-copilot-smoke]

Validates release-readiness artifacts:
  - release checklist content
  - plugin version metadata
  - validator and smoke-test script presence
  - existing docs/power/root/benchmark validation suite
  - cross-host benchmark comparability validation
  - direct Copilot CLI smoke script when copilot is available
USAGE
}

log() { printf 'ok: %s\n' "$*"; }
warn() { printf 'warn: %s\n' "$*" >&2; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

while (($#)); do
  case "$1" in
    --root)
      [[ $# -ge 2 ]] || fail "--root requires a path"
      ROOT="$2"
      shift 2
      ;;
    --skip-copilot-smoke)
      RUN_COPILOT_SMOKE=0
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

require_file() {
  [[ -f "$ROOT/$1" ]] || fail "missing required file: $1"
}

require_exec() {
  [[ -x "$ROOT/$1" ]] || fail "missing executable bit: $1"
}

require_contains() {
  local description="$1"
  local pattern="$2"
  shift 2
  (cd "$ROOT" && grep -Eiq -- "$pattern" "$@") || fail "$description"
  log "$description"
}

for path in \
  docs/release-checklist.md \
  scripts/validate-doc-links.sh \
  scripts/validate-power-surfaces.sh \
  scripts/validate-root-copilot-surfaces.sh \
  scripts/validate-copilot-state-contract.sh \
  scripts/validate-benchmark-evidence.sh \
  scripts/validate-cross-host-benchmark-data.py \
  scripts/validate-release-readiness.sh \
  scripts/smoke-copilot-cli.sh \
  packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh \
  packages/copilot-cli-plugin/plugin.json
do
  require_file "$path"
done

for path in \
  scripts/validate-doc-links.sh \
  scripts/validate-power-surfaces.sh \
  scripts/validate-root-copilot-surfaces.sh \
  scripts/validate-copilot-state-contract.sh \
  scripts/validate-benchmark-evidence.sh \
  scripts/validate-release-readiness.sh \
  scripts/smoke-copilot-cli.sh \
  packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh
do
  require_exec "$path"
done
log "release validator scripts exist and are executable"

require_contains "release checklist preserves CLI-first scope" 'CLI-first|Copilot CLI' docs/release-checklist.md
require_contains "release checklist keeps plugin canonical" 'plugin.*canonical|canonical.*plugin|oh-my-copilot-power-pack' docs/release-checklist.md
require_contains "release checklist keeps examples illustrative" 'examples?.*illustrative|illustrative.*examples?' docs/release-checklist.md
require_contains "release checklist documents versioning" 'version|semantic-version|plugin\.json' docs/release-checklist.md
require_contains "release checklist documents release notes" 'release notes' docs/release-checklist.md
require_contains "release checklist documents Copilot CLI smoke" 'smoke-copilot-cli\.sh|RUN_COPILOT_AGENT_SMOKE' docs/release-checklist.md
require_contains "release checklist documents parity wording scan" 'parity-guard|check-parity-claims' docs/release-checklist.md

python3 - "$ROOT/packages/copilot-cli-plugin/plugin.json" <<'PY'
from __future__ import annotations
import json
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
version = data.get("version", "")
if data.get("name") != "oh-my-copilot-power-pack":
    raise SystemExit("plugin package name drifted")
if not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", version):
    raise SystemExit(f"plugin version is not semver-like: {version!r}")
print(f"ok: plugin version metadata is release-shaped ({version})")
PY

(cd "$ROOT" && ./scripts/validate-doc-links.sh)
(cd "$ROOT" && ./packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh .)
(cd "$ROOT" && ./scripts/validate-power-surfaces.sh)
(cd "$ROOT" && ./scripts/validate-root-copilot-surfaces.sh)
(cd "$ROOT" && ./scripts/validate-copilot-state-contract.sh)
(cd "$ROOT" && ./scripts/validate-benchmark-evidence.sh)
(cd "$ROOT" && python3 ./scripts/validate-cross-host-benchmark-data.py --app-root ./apps/cross-host-benchmark-site)

if [[ "$RUN_COPILOT_SMOKE" == "1" ]]; then
  if command -v copilot >/dev/null 2>&1; then
    (cd "$ROOT" && ./scripts/smoke-copilot-cli.sh)
  else
    warn "copilot CLI unavailable; direct Copilot CLI smoke skipped"
  fi
else
  log "direct Copilot CLI smoke skipped by flag"
fi

log "release readiness validation complete"
