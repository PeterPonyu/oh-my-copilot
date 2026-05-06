#!/usr/bin/env bash
# Extended by US-004 to emit well-formed JSON to events.jsonl via common.sh helpers,
# replacing the inline python3 one-liner that was previously in hooks.json sessionStart.
# Wire format: {"schema_version":1,"source":"plugin","event":"sessionStart",...}
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=../../../.copilot-hooks/common.sh
source .copilot-hooks/common.sh

copilot_hook_init_config "plugin"
copilot_hook_log_event "sessionStart" "plugin"
copilot_hook_append_legacy "sessionStart" "plugin" ".copilot-hooks/session.log"
copilot_hook_finish
