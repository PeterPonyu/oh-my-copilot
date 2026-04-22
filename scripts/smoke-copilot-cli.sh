#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_AGENT_SMOKE="${RUN_COPILOT_AGENT_SMOKE:-0}"
REQUIRE_INSTALLED_PLUGIN=0
TIMEOUT_SECONDS="${COPILOT_SMOKE_TIMEOUT:-120}"

usage() {
  cat <<'USAGE'
Usage: scripts/smoke-copilot-cli.sh [--root PATH] [--run-agent-prompts] [--require-installed-plugin]

Runs direct, CLI-first Copilot smoke checks:
  - copilot CLI presence and command surface
  - root agent files
  - plugin metadata
  - optional constrained root/plugin agent prompt invocations
  - optional constrained repo task smoke for meaningful path-finding questions

Set RUN_COPILOT_AGENT_SMOKE=1 or pass --run-agent-prompts to run model-backed
agent prompt smoke tests. The default mode avoids network/model calls.
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
    --run-agent-prompts)
      RUN_AGENT_SMOKE=1
      shift
      ;;
    --require-installed-plugin)
      REQUIRE_INSTALLED_PLUGIN=1
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

command -v copilot >/dev/null 2>&1 || fail "copilot CLI not found"
command -v python3 >/dev/null 2>&1 || fail "python3 is required"

copilot --version
log "copilot CLI version command succeeds"

copilot --help | grep -Eq -- '--agent|--plugin-dir' || fail "copilot help does not expose expected agent/plugin options"
log "copilot help exposes agent/plugin options"

copilot plugin --help >/dev/null
log "copilot plugin command is available"

for agent in research reviewer verifier; do
  [[ -f "$ROOT/.github/agents/$agent.agent.md" ]] || fail "missing root agent: $agent"
done
log "root reviewer/research/verifier agents exist"

python3 - "$ROOT/packages/copilot-cli-plugin/plugin.json" <<'PY'
from __future__ import annotations
import json
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
if data.get("name") != "oh-my-copilot-power-pack":
    raise SystemExit("plugin name must be oh-my-copilot-power-pack")
version = data.get("version", "")
if not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", version):
    raise SystemExit(f"plugin version must look semver-like: {version!r}")
for key in ("agents", "skills", "hooks"):
    if key not in data:
        raise SystemExit(f"missing plugin key: {key}")
print(f"ok: plugin metadata parses for {data['name']}@{version}")
PY

plugin_installed="$(
  python3 - <<'PY'
from __future__ import annotations
import json
import pathlib

cfg = pathlib.Path.home() / ".copilot" / "config.json"
if not cfg.exists():
    print("no")
    raise SystemExit
try:
    data = json.loads(cfg.read_text(encoding="utf-8"))
except Exception:
    print("no")
    raise SystemExit
for entry in data.get("installedPlugins", []):
    if entry.get("name") == "oh-my-copilot-power-pack":
        print("yes")
        break
else:
    print("no")
PY
)"

if [[ "$plugin_installed" == "yes" ]]; then
  log "installed plugin entry found in ~/.copilot/config.json"
elif [[ "$REQUIRE_INSTALLED_PLUGIN" == "1" ]]; then
  fail "installed plugin entry missing from ~/.copilot/config.json"
else
  warn "installed plugin entry not found; namespaced prompt smoke will be skipped unless installed"
fi

run_prompt_smoke() {
  local label="$1"
  local agent="$2"
  local expected="$3"
  local output

  output="$(
    timeout "$TIMEOUT_SECONDS" copilot \
      --agent "$agent" \
      --model auto \
      --allow-all \
      --no-color \
      -s \
      -p "Do not edit files or run tools. Reply with exactly: $expected" 2>&1
  )" || {
    printf '%s\n' "$output" >&2
    fail "$label prompt smoke failed"
  }

  printf '%s\n' "$output" | grep -Fq "$expected" || {
    printf '%s\n' "$output" >&2
    fail "$label prompt smoke did not include $expected"
  }
  log "$label prompt smoke returned $expected"
}

run_task_smoke() {
  local output

  output="$(
    timeout "$TIMEOUT_SECONDS" copilot \
      --agent reviewer \
      --model auto \
      --allow-all \
      --no-color \
      -s \
      -p "Without editing files or running write commands, identify the repo's refinement priority map doc, plugin boundary review doc, and benchmark evidence validator script. Reply with exactly: TASK_SCENARIO_OK docs/refinement-priority-map.md docs/plugin-boundary-review.md scripts/validate-benchmark-evidence.sh" 2>&1
  )" || {
    printf '%s\n' "$output" >&2
    fail "task scenario smoke failed"
  }

  printf '%s\n' "$output" | grep -Fq 'TASK_SCENARIO_OK docs/refinement-priority-map.md docs/plugin-boundary-review.md scripts/validate-benchmark-evidence.sh' || {
    printf '%s\n' "$output" >&2
    fail "task scenario smoke did not return the expected repo-task answer"
  }
  log "task scenario smoke returned TASK_SCENARIO_OK"
}

if [[ "$RUN_AGENT_SMOKE" == "1" ]]; then
  run_prompt_smoke "root reviewer agent" "reviewer" "ROOT_AGENT_OK"
  if [[ "$plugin_installed" == "yes" ]]; then
    run_prompt_smoke "namespaced plugin reviewer agent" "oh-my-copilot-power-pack:reviewer" "PLUGIN_AGENT_OK"
  else
    warn "namespaced plugin reviewer prompt smoke skipped because plugin is not installed"
  fi
  run_task_smoke
else
  log "model-backed agent prompt smoke skipped (set RUN_COPILOT_AGENT_SMOKE=1 to enable)"
fi

log "Copilot smoke proves route availability only; cross-host comparability is validated by separate benchmark harvest gates"
log "Copilot CLI smoke validation complete"
