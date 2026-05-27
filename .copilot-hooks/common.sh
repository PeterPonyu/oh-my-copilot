#!/usr/bin/env bash
set -euo pipefail

copilot_hook_capture_stdin() {
  COPILOT_HOOK_STDIN_FILE="$(mktemp)"
  cat >"$COPILOT_HOOK_STDIN_FILE" || true
  export COPILOT_HOOK_STDIN_FILE
}

copilot_hook_workspace_root() {
  git rev-parse --show-toplevel 2>/dev/null || pwd
}

copilot_hook_init_config() {
  local source_label="$1"
  local workspace_root
  workspace_root="$(copilot_hook_workspace_root)"
  mkdir -p .copilot-hooks
  local tmp
  tmp="$(mktemp)"
  if python3 - "$workspace_root" "$source_label" .copilot-hooks/config.json >"$tmp" <<'PY'
from __future__ import annotations
import datetime as dt
import json
import pathlib
import re
import sys

workspace_root = pathlib.Path(sys.argv[1]).resolve()
source_label = sys.argv[2]
config_path = pathlib.Path(sys.argv[3])
slug = re.sub(r"[^a-z0-9._-]+", "-", workspace_root.name.lower()).strip("-") or "workspace"
now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
config = None
if config_path.is_file():
    try:
        parsed = json.loads(config_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        parsed = None
    if isinstance(parsed, dict) and pathlib.Path(str(parsed.get("workspace_root", ""))).expanduser().resolve() == workspace_root:
        config = parsed

if config is None:
    config = {
        "schema_version": 1,
        "log_schema": "oh-my-copilot-hook-log-v1",
        "project_slug": slug,
        "workspace_root": str(workspace_root),
        "created_at": now,
        "default_source": source_label,
        "log_files": {
            "events": ".copilot-hooks/events.jsonl",
            "session": ".copilot-hooks/session.log",
            "tools": ".copilot-hooks/tools.log",
            "warnings": ".copilot-hooks/warnings.log",
        },
    }

print(json.dumps(config, indent=2))
PY
  then
    if [[ ! -f .copilot-hooks/config.json ]] || ! cmp -s "$tmp" .copilot-hooks/config.json; then
      mv "$tmp" .copilot-hooks/config.json
    else
      rm -f "$tmp"
    fi
  else
    rm -f "$tmp"
    return 1
  fi
}

copilot_hook_log_event() {
  local event_name="$1"
  local source_label="$2"
  local workspace_root
  workspace_root="$(copilot_hook_workspace_root)"
  python3 - "$event_name" "$source_label" "$workspace_root" "${COPILOT_HOOK_STDIN_FILE:-}" >> .copilot-hooks/events.jsonl <<'PY'
from __future__ import annotations
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import sys

event_name = sys.argv[1]
source_label = sys.argv[2]
workspace_root = pathlib.Path(sys.argv[3]).resolve()
payload_path = pathlib.Path(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] else None
slug = re.sub(r"[^a-z0-9._-]+", "-", workspace_root.name.lower()).strip("-") or "workspace"
payload_bytes = b""
payload_summary = {}

if payload_path and payload_path.exists():
    payload_bytes = payload_path.read_bytes()
    text = payload_bytes.decode("utf-8", "replace")
    if text.strip():
        try:
            parsed = json.loads(text)
        except Exception:
            payload_summary["preview"] = text[:160]
        else:
            if isinstance(parsed, dict):
                for key in ("tool", "toolName", "command", "bash", "cwd", "type", "agent", "prompt"):
                    if key in parsed:
                        payload_summary[key] = parsed[key]

env_keys = (
    "COPILOT_SESSION_ID",
    "COPILOT_TOOL_NAME",
    "COPILOT_TOOL",
    "GITHUB_REPOSITORY",
    "TERM_PROGRAM",
)
event = {
    "schema_version": 1,
    "source": source_label,
    "event": event_name,
    "timestamp": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    "cwd": os.getcwd(),
    "workspace_root": str(workspace_root),
    "project_slug": slug,
    "payload_bytes": len(payload_bytes),
    "payload_sha256": hashlib.sha256(payload_bytes).hexdigest() if payload_bytes else None,
    "payload_summary": payload_summary,
    "env": {k: os.getenv(k) for k in env_keys if os.getenv(k)},
}
print(json.dumps(event))
PY
}

copilot_hook_append_legacy() {
  local event_name="$1"
  local source_label="$2"
  local target_file="$3"
  printf 'source=%s event=%s timestamp=%s cwd=%s\n' \
    "$source_label" \
    "$event_name" \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$(pwd)" >> "$target_file"
}

copilot_hook_warn() {
  local message="$1"
  mkdir -p .copilot-hooks
  printf 'timestamp=%s warning=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$message" >> .copilot-hooks/warnings.log
}

copilot_hook_finish() {
  if [[ -n "${COPILOT_HOOK_STDIN_FILE:-}" && -f "${COPILOT_HOOK_STDIN_FILE:-}" ]]; then
    rm -f "$COPILOT_HOOK_STDIN_FILE"
  fi
  printf '{"continue":true}\n'
}

# omcp_call_store — bridge from bash hooks to omcp MCP store .mjs functions.
#
# Args:
#   $1: store module name (without .mjs), e.g. "trace-store", "state-store",
#       "notepad-store"
#   $2: exported function name, e.g. "traceWrite", "stateListActive",
#       "notepadPrune"
#   $3: JSON args literal — MUST be built with jq (NOT bash string
#       interpolation), e.g.:
#         args=$(jq -nc --arg tool "$tool" '{kind:"tool_failure",tool:$tool}')
#         omcp_call_store trace-store traceWrite "$args"
#
# Behavior:
#   - Always exits 0 (telemetry is non-load-bearing per ADR-2 of the
#     post-Wave-B consolidation plan; broken bridge must not kill a session)
#   - On success: prints JSON.stringify(result) to stdout
#   - On error: prints "[omcp-bridge] <message>" to stderr; stdout empty
#   - If node is not on PATH: prints warning to stderr and returns 0
#
# Note: the called .mjs function operates relative to the current process's
# cwd. Hooks set cwd to repo root before sourcing common.sh, so MCP store
# paths like .omcp/state/<key>.json resolve correctly.
omcp_call_store() {
  local module="$1" fn="$2" json_args="${3:-}"
  if [[ -z "$json_args" ]]; then
    json_args='{}'
  fi

  if ! command -v node >/dev/null 2>&1; then
    printf '[omcp-bridge] node not on PATH; skipping %s.%s\n' "$module" "$fn" >&2
    return 0
  fi

  local plugin_root
  plugin_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/packages/copilot-cli-plugin"

  # Args passed via process.argv, not interpolated into JS source, to avoid
  # shell injection via $fn, $module, or $json_args.
  node -e '
    const [pluginRoot, mod, fn, jsonArgs] = process.argv.slice(1);
    const parsed = JSON.parse(jsonArgs || "{}");
    import(pluginRoot + "/mcp-server/" + mod + ".mjs").then(m => m[fn](parsed)).then(result => {
      if (result !== undefined) console.log(JSON.stringify(result));
    }).catch(e => {
      console.error("[omcp-bridge]", e && e.message ? e.message : String(e));
    });
  ' -- "$plugin_root" "$module" "$fn" "$json_args" || true
}
