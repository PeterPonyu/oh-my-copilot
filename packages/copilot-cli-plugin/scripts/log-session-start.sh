#!/usr/bin/env bash
# Extended by US-004 to emit well-formed JSON to events.jsonl via common.sh helpers,
# replacing the inline python3 one-liner that was previously in hooks.json sessionStart.
# Wire format: {"schema_version":1,"source":"plugin","event":"sessionStart",...}
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# shellcheck source=../../../.copilot-hooks/common.sh
source .copilot-hooks/common.sh

copilot_hook_init_config "plugin"
copilot_hook_log_event "sessionStart" "plugin"
copilot_hook_append_legacy "sessionStart" "plugin" ".copilot-hooks/session.log"

# Wave-C-3: surface any orchestration modes still active from prior sessions
# (per ADR-2). Logs to session.log; non-fatal if MCP store unavailable.
active_json="$(omcp_call_store state-store stateListActive '{}' 2>/dev/null || true)"
if [[ -n "$active_json" ]] && command -v jq >/dev/null 2>&1; then
  count="$(echo "$active_json" | jq -r '.active | length' 2>/dev/null || echo 0)"
  if [[ "$count" =~ ^[0-9]+$ ]] && [[ "$count" -gt 0 ]]; then
    modes="$(echo "$active_json" | jq -r '.active[].mode' 2>/dev/null | tr '\n' ',' | sed 's/,$//')"
    printf 'source=plugin event=sessionStart resumed=true active_modes=%s\n' "$modes" >> .copilot-hooks/session.log
  fi
fi

copilot_hook_finish
