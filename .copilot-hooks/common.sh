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
  if [[ ! -f .copilot-hooks/config.json ]]; then
    local tmp
    tmp="$(mktemp)"
    python3 - "$workspace_root" "$source_label" >"$tmp" <<'PY'
from __future__ import annotations
import datetime as dt
import json
import pathlib
import re
import sys

workspace_root = pathlib.Path(sys.argv[1]).resolve()
source_label = sys.argv[2]
slug = re.sub(r"[^a-z0-9._-]+", "-", workspace_root.name.lower()).strip("-") or "workspace"
config = {
    "schema_version": 1,
    "log_schema": "oh-my-copilot-hook-log-v1",
    "project_slug": slug,
    "workspace_root": str(workspace_root),
    "created_at": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
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
    mv "$tmp" .copilot-hooks/config.json
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
