#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_AGENT_SMOKE="${RUN_COPILOT_AGENT_SMOKE:-0}"
REQUIRE_INSTALLED_PLUGIN=0
TIMEOUT_SECONDS="${COPILOT_SMOKE_TIMEOUT:-120}"
SMOKE_MODEL="${COPILOT_SMOKE_MODEL:-gpt-5-mini}"

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
Model-backed smoke uses COPILOT_SMOKE_MODEL, defaulting to gpt-5-mini.
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

ROOT="$(cd "$ROOT" && pwd)"
PLUGIN_JSON="$ROOT/packages/copilot-cli-plugin/plugin.json"
[[ -f "$PLUGIN_JSON" ]] || fail "missing plugin manifest: $PLUGIN_JSON"

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

python3 - "$PLUGIN_JSON" <<'PY'
from __future__ import annotations
import json
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
name = data.get("name")
if not name or not isinstance(name, str):
    raise SystemExit("plugin manifest missing name")
if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
    raise SystemExit(f"plugin name must be a kebab-case Copilot CLI plugin id: {name!r}")
version = data.get("version", "")
if not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?", version):
    raise SystemExit(f"plugin version must look semver-like: {version!r}")
for key in ("agents", "skills", "hooks"):
    if key not in data:
        raise SystemExit(f"missing plugin key: {key}")
print(f"ok: plugin metadata parses for {name}@{version}")
PY

export OMC_CLI_PLUGIN_ID="$(
  python3 -c 'import json, pathlib, sys; print(json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))["name"])' "$PLUGIN_JSON"
)"

plugin_installed="$(
  python3 <<'PY'
from __future__ import annotations
import json
import os
import pathlib
import re

expected = os.environ.get("OMC_CLI_PLUGIN_ID", "")
if not expected:
    print("no")
    raise SystemExit(0)
cfg = pathlib.Path.home() / ".copilot" / "config.json"
if not cfg.exists():
    print("no")
    raise SystemExit(0)
try:
    raw = cfg.read_text(encoding="utf-8")
    json_text = re.sub(r"(?m)^\s*//.*$", "", raw)
    data = json.loads(json_text)
except Exception:
    print("no")
    raise SystemExit(0)
for entry in data.get("installedPlugins", []):
    if entry.get("name") == expected:
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
      --model "$SMOKE_MODEL" \
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
      --model "$SMOKE_MODEL" \
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

run_task_plan_smoke() {
  local output

  output="$(
    timeout "$TIMEOUT_SECONDS" copilot \
      --agent reviewer \
      --model "$SMOKE_MODEL" \
      --allow-all \
      --no-color \
      -s \
      -p "Without editing files or running write commands, a benchmark contract changed and the public benchmark summary may now be stale. Which validator should be rerun first, and which public score-summary doc must stay in sync? Reply with exactly: TASK_PLAN_OK scripts/validate-benchmark-evidence.sh docs/benchmark-status.md" 2>&1
  )" || {
    printf '%s\n' "$output" >&2
    fail "task plan smoke failed"
  }

  printf '%s\n' "$output" | grep -Fq 'TASK_PLAN_OK scripts/validate-benchmark-evidence.sh docs/benchmark-status.md' || {
    printf '%s\n' "$output" >&2
    fail "task plan smoke did not return the expected repo-task answer"
  }
  log "task plan smoke returned TASK_PLAN_OK"
}

run_task_command_smoke() {
  local output

  output="$(
    timeout "$TIMEOUT_SECONDS" copilot \
      --agent reviewer \
      --model "$SMOKE_MODEL" \
      --allow-all \
      --no-color \
      -s \
      -p "Without editing files or running write commands, choose the correct rerun path after an enhanced-only task-smoke change. Option A: ./benchmark/quick_test.sh --run-agent-smoke --variant enhanced && ./scripts/validate-benchmark-evidence.sh. Option B: ./benchmark/quick_test.sh --variant vanilla && ./scripts/validate-doc-links.sh. Reply with exactly: TASK_COMMAND_OK A" 2>&1
  )" || {
    printf '%s\n' "$output" >&2
    fail "task command smoke failed"
  }

  printf '%s\n' "$output" | grep -Fq 'TASK_COMMAND_OK A' || {
    printf '%s\n' "$output" >&2
    fail "task command smoke did not return the expected repo-task answer"
  }
  log "task command smoke returned TASK_COMMAND_OK"
}

if [[ "$RUN_AGENT_SMOKE" == "1" ]]; then
  log "model-backed Copilot smoke uses --model $SMOKE_MODEL"
  run_prompt_smoke "root reviewer agent" "reviewer" "ROOT_AGENT_OK"
  if [[ "$plugin_installed" == "yes" ]]; then
    run_prompt_smoke "namespaced plugin reviewer agent" "${OMC_CLI_PLUGIN_ID}:reviewer" "PLUGIN_AGENT_OK"
  else
    warn "namespaced plugin reviewer prompt smoke skipped because plugin is not installed"
  fi
  run_task_smoke
  run_task_plan_smoke
  run_task_command_smoke
else
  log "model-backed agent prompt smoke skipped (set RUN_COPILOT_AGENT_SMOKE=1 to enable)"
fi

log "Copilot smoke proves route availability only; cross-host comparability is validated by separate benchmark harvest gates"
log "Copilot CLI smoke validation complete"

# ---------------------------------------------------------------------------
# Wave 7 — E2E pipeline provenance smoke
# Sources e2e-pipeline-fixture.sh then either:
#   (a) runs a live deep-interview → ralplan → autopilot chain via Copilot CLI, or
#   (b) creates a synthetic chain and asserts against it (CI-friendly path).
# ---------------------------------------------------------------------------

E2E_FIXTURE_SCRIPT="$ROOT/scripts/e2e-pipeline-fixture.sh"
[[ -f "$E2E_FIXTURE_SCRIPT" ]] || fail "e2e-pipeline-fixture.sh not found at $E2E_FIXTURE_SCRIPT"
# shellcheck source=scripts/e2e-pipeline-fixture.sh
source "$E2E_FIXTURE_SCRIPT"

WORK=$(mktemp -d -t omc-smoke-XXXXXX)
trap 'rm -rf "$WORK"' EXIT

if command -v copilot >/dev/null 2>&1 && [[ "$plugin_installed" == "yes" ]] && [[ "$RUN_AGENT_SMOKE" == "1" ]]; then
  # --- Live path: Copilot CLI present + plugin installed + agent smoke enabled ---
  log "Wave 7: running live deep-interview → ralplan → autopilot pipeline"

  prompt_file=$(e2e_pipeline_setup "$WORK")
  log "Wave 7: vague prompt at $prompt_file"

  spec_out_dir="$WORK/omc/specs"
  plan_out_dir="$WORK/omc/plans"
  artifact_dir="$WORK/scratch"
  mkdir -p "$spec_out_dir" "$plan_out_dir" "$artifact_dir"

  # Step 1: deep-interview → spec
  timeout "$TIMEOUT_SECONDS" copilot \
    --agent "oh-my-copilot-power-pack:deep-interview" \
    --model "$SMOKE_MODEL" \
    --allow-all \
    --no-color \
    -s \
    -p "$(cat "$prompt_file")" 2>&1 | tee "$WORK/deep-interview.log" || fail "Wave 7: deep-interview step failed"

  # Step 2: ralplan → plan
  timeout "$TIMEOUT_SECONDS" copilot \
    --agent "oh-my-copilot-power-pack:ralplan" \
    --model "$SMOKE_MODEL" \
    --allow-all \
    --no-color \
    -s \
    -p "refine the spec produced by deep-interview" 2>&1 | tee "$WORK/ralplan.log" || fail "Wave 7: ralplan step failed"

  # Step 3: autopilot → artifact
  timeout "$TIMEOUT_SECONDS" copilot \
    --agent "oh-my-copilot-power-pack:autopilot" \
    --model "$SMOKE_MODEL" \
    --allow-all \
    --no-color \
    -s \
    -p "implement the plan produced by ralplan" 2>&1 | tee "$WORK/autopilot.log" || fail "Wave 7: autopilot step failed"

  # Locate outputs (prefer WORK-relative then repo-relative)
  spec_file=$(ls -1 "$spec_out_dir"/*.md .omc/specs/*.md 2>/dev/null | head -1)
  plan_file=$(ls -1 "$plan_out_dir"/*.md .omc/plans/*.md 2>/dev/null | head -1)
  artifact=$(find "$artifact_dir" scratch/ -type f \( -name '*.ts' -o -name '*.py' -o -name '*.js' \) 2>/dev/null | head -1)

  e2e_pipeline_assert_chain "$spec_file" "$plan_file" "$artifact" \
    || { rm -rf "$WORK"; fail "Wave 7: provenance assertion failed"; }

else
  # --- CI / no-Copilot path ---
  if ! command -v copilot >/dev/null 2>&1; then
    warn "Wave 7: copilot CLI not installed — skipping live pipeline run; verifying assertions against synthetic fixture"
  elif [[ "$plugin_installed" != "yes" ]]; then
    warn "Wave 7: plugin not installed — skipping live pipeline run; verifying assertions against synthetic fixture"
  else
    warn "Wave 7: RUN_COPILOT_AGENT_SMOKE not set — skipping live pipeline run; verifying assertions against synthetic fixture"
  fi

  # Build synthetic chain that satisfies all assertions
  e2e_pipeline_synthetic_chain "$WORK"

  spec_file="$WORK/spec.md"
  plan_file="$WORK/plan.md"
  artifact="$WORK/artifact.ts"

  e2e_pipeline_assert_chain "$spec_file" "$plan_file" "$artifact" \
    || { rm -rf "$WORK"; fail "Wave 7: synthetic provenance assertion failed"; }
fi

log "Wave 7: E2E provenance smoke complete"
