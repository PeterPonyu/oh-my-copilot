#!/usr/bin/env bash
# Extended by US-004 to emit well-formed JSON to events.jsonl via common.sh helpers,
# replacing the inline python3 one-liner that was previously in hooks.json postToolUse.
# Wire format: {"schema_version":1,"source":"plugin","event":"postToolUse",...}
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=../../../.copilot-hooks/common.sh
source .copilot-hooks/common.sh

copilot_hook_init_config "plugin"
copilot_hook_log_event "postToolUse" "plugin"
copilot_hook_append_legacy "postToolUse" "plugin" ".copilot-hooks/tools.log"

if [[ -x "./skills/parity-guard/check-parity-claims.sh" ]]; then
  if ! ./skills/parity-guard/check-parity-claims.sh . >> .copilot-hooks/tools.log 2>&1; then
    copilot_hook_warn "parity guard failed at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    exit 1
  fi
fi

copilot_hook_finish
