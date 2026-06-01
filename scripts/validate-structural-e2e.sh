#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEEP_TMP=0

usage() {
  cat <<'USAGE'
Usage: scripts/validate-structural-e2e.sh [--root PATH] [--keep-tmp]

Runs the credential-free structural E2E fixture for oh-my-copilot:
  - creates an isolated temp workspace/home
  - exercises the pipeline fixture helpers
  - runs plugin hook scripts against synthetic envelopes
  - validates .omcp trace/state and hook artifacts
  - writes a validation summary in the temp workspace

No live Copilot CLI, network, or credentials are required.
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
    --keep-tmp)
      KEEP_TMP=1
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
PLUGIN_SCRIPTS="$ROOT/packages/copilot-cli-plugin/scripts"
FIXTURE_HELPERS="$ROOT/scripts/e2e-pipeline-fixture.sh"
[[ -f "$FIXTURE_HELPERS" ]] || fail "missing fixture helpers: scripts/e2e-pipeline-fixture.sh"
[[ -x "$PLUGIN_SCRIPTS/post-tool-audit.sh" ]] || fail "missing executable hook: packages/copilot-cli-plugin/scripts/post-tool-audit.sh"
[[ -x "$PLUGIN_SCRIPTS/log-session-start.sh" ]] || fail "missing executable hook: packages/copilot-cli-plugin/scripts/log-session-start.sh"
[[ -x "$PLUGIN_SCRIPTS/session-end-audit.sh" ]] || fail "missing executable hook: packages/copilot-cli-plugin/scripts/session-end-audit.sh"

# shellcheck source=./e2e-pipeline-fixture.sh
source "$FIXTURE_HELPERS"

tmp_root="$(mktemp -d "${TMPDIR:-/tmp}/omcp-structural-e2e.XXXXXX")"
if [[ "$KEEP_TMP" != "1" ]]; then
  trap 'rm -rf "$tmp_root"' EXIT
else
  printf 'tmp: %s\n' "$tmp_root"
fi

workspace="$tmp_root/workspace"
home_dir="$tmp_root/home"
scratch="$workspace/scratch"
mkdir -p "$workspace/.copilot-hooks" "$workspace/.omcp/validation" "$workspace/.omcp/traces" "$home_dir" "$scratch"
mkdir -p "$workspace/packages/copilot-cli-plugin"
ln -s "$ROOT/packages/copilot-cli-plugin/mcp-server" "$workspace/packages/copilot-cli-plugin/mcp-server"
cp "$ROOT/.copilot-hooks/common.sh" "$workspace/.copilot-hooks/common.sh"

prompt_path="$(e2e_pipeline_setup "$scratch")"
[[ -f "$prompt_path" ]] || fail "fixture prompt was not copied into scratch workspace"
e2e_pipeline_synthetic_chain "$scratch" >/dev/null
e2e_pipeline_assert_chain "$scratch/spec.md" "$scratch/plan.md" "$scratch/artifact.ts" >/dev/null
log "pipeline provenance fixture passes in isolated workspace"

(
  cd "$workspace"
  export HOME="$home_dir"
  export COPILOT_SESSION_ID="structural-e2e-session"
  printf '{"session_id":"structural-e2e-session","cwd":"%s"}\n' "$workspace" \
    | bash "$PLUGIN_SCRIPTS/log-session-start.sh" >"$tmp_root/log-session-start.out"
  printf '{"tool":"structural-e2e-failing-tool","exit_code":42,"stderr":"synthetic failure for structural e2e"}\n' \
    | bash "$PLUGIN_SCRIPTS/post-tool-audit.sh" >"$tmp_root/post-tool-audit.out"
  printf '{"session_id":"structural-e2e-session","cwd":"%s"}\n' "$workspace" \
    | bash "$PLUGIN_SCRIPTS/session-end-audit.sh" >"$tmp_root/session-end-audit.out"
)

for hook_file in \
  "$workspace/.copilot-hooks/config.json" \
  "$workspace/.copilot-hooks/events.jsonl" \
  "$workspace/.copilot-hooks/session.log" \
  "$workspace/.copilot-hooks/tools.log"
do
  [[ -s "$hook_file" ]] || fail "hook artifact missing or empty: ${hook_file#$workspace/}"
done
log "hook scripts create expected isolated workspace artifacts"

python3 - "$workspace" <<'PY'
from __future__ import annotations
import json
import pathlib
import sys

workspace = pathlib.Path(sys.argv[1])
events = workspace / ".copilot-hooks" / "events.jsonl"
parsed = [json.loads(line) for line in events.read_text(encoding="utf-8").splitlines() if line.strip()]
seen = {event.get("event") for event in parsed}
required = {"sessionStart", "postToolUse", "sessionEnd"}
missing = required - seen
if missing:
    raise SystemExit(f"missing hook events: {sorted(missing)}")
for event in parsed:
    event_name = event.get("event")
    if "workspace_root" in event:
        if pathlib.Path(event["workspace_root"]).resolve() != workspace.resolve():
            raise SystemExit(f"event workspace_root escaped temp workspace: {event['workspace_root']}")
    elif pathlib.Path(event.get("cwd", "")).resolve() != workspace.resolve():
        raise SystemExit(f"event {event_name} missing workspace_root and cwd escaped temp workspace: {event.get('cwd')}")
print("ok: hook events parse and remain scoped to temp workspace")
PY

trace_file="$workspace/.omcp/traces/default.jsonl"
if [[ -f "$trace_file" ]]; then
  grep -q 'structural-e2e-failing-tool' "$trace_file" \
    || fail "trace file exists but does not include synthetic failing tool"
  log "failure trace captured in .omcp/traces/default.jsonl"
else
  fail "expected failure trace was not written to .omcp/traces/default.jsonl"
fi

summary="$workspace/.omcp/validation/structural-e2e-summary.md"
cat > "$summary" <<EOF_SUMMARY
# oh-my-copilot structural E2E summary

- workspace: $workspace
- home: $home_dir
- prompt_fixture: $prompt_path
- pipeline_chain: PASS
- hook_artifacts: PASS
- trace_capture: PASS
EOF_SUMMARY
[[ -s "$summary" ]] || fail "validation summary was not written"
log "structural E2E summary written to ${summary#$workspace/}"
log "structural E2E validation complete"
