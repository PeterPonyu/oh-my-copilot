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

# Source common.sh: prefer workspace-local copy; fall back to plugin-bundled copy.
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f ".copilot-hooks/common.sh" ]]; then
  # shellcheck source=../../../.copilot-hooks/common.sh
  source .copilot-hooks/common.sh
elif [[ -f "${_SCRIPT_DIR}/common.sh" ]]; then
  # shellcheck source=./common.sh
  source "${_SCRIPT_DIR}/common.sh"
else
  echo "warn: common.sh not found in workspace .copilot-hooks/ or plugin scripts/; skipping post-tool-audit hook" >&2
  exit 0
fi

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

# Rules and memory policy: capture rule context lazily after file-touch tools.
# The hook does not assume Copilot can inject extra model-visible text; it stores
# pending context for MCP consumers at omcp://rules/pending.
if [[ -n "${COPILOT_HOOK_STDIN_FILE:-}" ]] && [[ -f "${COPILOT_HOOK_STDIN_FILE:-}" ]] && command -v jq >/dev/null 2>&1; then
  tool_name="$(jq -r '.tool // .toolName // .tool_name // .name // empty' "$COPILOT_HOOK_STDIN_FILE" 2>/dev/null || true)"
  file_path="$(jq -r '.file_path // .filePath // .path // .tool_input.file_path // .tool_input.path // .toolInput.file_path // .toolInput.path // .input.file_path // .input.filePath // .input.path // empty' "$COPILOT_HOOK_STDIN_FILE" 2>/dev/null || true)"
  if [[ -n "$file_path" ]]; then
    session_id="${COPILOT_SESSION_ID:-$(jq -r '.session_id // .sessionId // "default"' "$COPILOT_HOOK_STDIN_FILE" 2>/dev/null || echo default)}"
    rules_args="$(jq -nc \
      --arg path "$file_path" \
      --arg tool "${tool_name:-read}" \
      --arg session_id "$session_id" \
      '{path:$path,tool:$tool,session_id:$session_id}')"
    rules_json="$(omcp_call_store rules-store rulesContextForFile "$rules_args" 2>/dev/null || true)"
    matched="$(printf '%s' "$rules_json" | jq -r '.matched // 0' 2>/dev/null || echo 0)"
    if [[ "$matched" =~ ^[0-9]+$ ]] && [[ "$matched" -gt 0 ]]; then
      safe_file_path="$(printf '%s' "$file_path" | LC_ALL=C tr '\r\n\t' '???')"
      printf 'source=plugin event=rulesPending matched=%s file=%s\n' "$matched" "$safe_file_path" >> .copilot-hooks/tools.log
    fi
  fi
fi

# Parity guard runs warn-only in postToolUse to avoid hard-failing normal tool
# use on false positives or slow scans. Hard-fail mode is reserved for explicit
# release validators (validate-release-readiness.sh).
if [[ -x "./skills/parity-guard/check-parity-claims.sh" ]]; then
  if ! ./skills/parity-guard/check-parity-claims.sh . >> .copilot-hooks/tools.log 2>&1; then
    copilot_hook_warn "parity guard warning at $(date -u +%Y-%m-%dT%H:%M:%SZ) (non-blocking; run validate-release-readiness.sh to hard-fail)"
  fi
fi

copilot_hook_finish
