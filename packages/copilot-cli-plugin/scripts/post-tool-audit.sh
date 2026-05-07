#!/usr/bin/env bash
# Extended by US-004 to emit well-formed JSON to events.jsonl via common.sh helpers,
# replacing the inline python3 one-liner that was previously in hooks.json postToolUse.
# Wire format: {"schema_version":1,"source":"plugin","event":"postToolUse",...}
set -euo pipefail

# Resolve the actual workspace root, not the install symlink path.
# Copilot CLI fires hooks with cwd=workspace, so $PWD is authoritative.
# git rev-parse is a defensive fallback when invoked outside a git checkout.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# shellcheck source=../../../.copilot-hooks/common.sh
source .copilot-hooks/common.sh

copilot_hook_capture_stdin
copilot_hook_init_config "plugin"
copilot_hook_log_event "postToolUse" "plugin"
copilot_hook_append_legacy "postToolUse" "plugin" ".copilot-hooks/tools.log"

# Wave-C-3: write a trace event on tool failure (per ADR-2). Best-effort
# failure detection — looks for exit_code != 0 or non-empty error field
# in the captured envelope. Bridge errors are absorbed by omcp_call_store.
if [[ -n "${COPILOT_HOOK_STDIN_FILE:-}" ]] && [[ -f "${COPILOT_HOOK_STDIN_FILE:-}" ]] && command -v jq >/dev/null 2>&1; then
  ec_raw="$(jq -r '.exit_code // .exitCode // empty' "$COPILOT_HOOK_STDIN_FILE" 2>/dev/null || true)"
  err_raw="$(jq -r '.error // empty' "$COPILOT_HOOK_STDIN_FILE" 2>/dev/null || true)"
  failed=0
  if [[ -n "$ec_raw" && "$ec_raw" != "0" && "$ec_raw" != "null" ]]; then
    failed=1
  fi
  if [[ -n "$err_raw" ]]; then
    failed=1
  fi
  if [[ "$failed" -eq 1 ]]; then
    tool_name="$(jq -r '.tool // .toolName // "unknown"' "$COPILOT_HOOK_STDIN_FILE" 2>/dev/null || echo unknown)"
    stderr_snip="$(jq -r '.stderr // empty' "$COPILOT_HOOK_STDIN_FILE" 2>/dev/null | head -c 500 || true)"
    ec_int="${ec_raw:-1}"
    [[ "$ec_int" =~ ^-?[0-9]+$ ]] || ec_int=1
    trace_args="$(jq -nc \
      --arg kind tool_failure \
      --arg tool "$tool_name" \
      --argjson ec "$ec_int" \
      --arg snip "$stderr_snip" \
      '{kind:$kind, tool:$tool, exit_code:$ec, stderr_snippet:$snip}')"
    omcp_call_store trace-store traceWrite "$trace_args" >/dev/null
  fi
fi

if [[ -x "./skills/parity-guard/check-parity-claims.sh" ]]; then
  if ! ./skills/parity-guard/check-parity-claims.sh . >> .copilot-hooks/tools.log 2>&1; then
    copilot_hook_warn "parity guard failed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    exit 1
  fi
fi

copilot_hook_finish
