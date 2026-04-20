#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

HOOK_SOURCE="${HOOK_SOURCE:-example-workspace}"
copilot_hook_capture_stdin
copilot_hook_init_config "$HOOK_SOURCE"
copilot_hook_log_event "postToolUse" "$HOOK_SOURCE"
copilot_hook_append_legacy "postToolUse" "$HOOK_SOURCE" ".copilot-hooks/tools.log"

if [[ -x ./.github/skills/parity-guard/check-parity-claims.sh ]]; then
  if ! ./.github/skills/parity-guard/check-parity-claims.sh . >> .copilot-hooks/tools.log 2>&1; then
    copilot_hook_warn "parity guard reported bounded wording drift"
  fi
fi

copilot_hook_finish
