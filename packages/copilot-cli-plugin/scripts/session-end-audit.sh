#!/usr/bin/env bash
# session-end-audit.sh — Wave 2, Hook: sessionEnd
#
# Appends a sessionEnd event to .copilot-hooks/events.jsonl and a
# closing summary line to .copilot-hooks/session.log.
#
# Stdin/env contract (Wave 0):
#   No stdin payload for sessionEnd; env vars may carry session metadata.

set -euo pipefail

COMMON_SH=".copilot-hooks/common.sh"

# Source common helpers if present (graceful no-op if missing)
if [ -f "$COMMON_SH" ]; then
  # shellcheck source=/dev/null
  source "$COMMON_SH"
fi

mkdir -p .copilot-hooks

NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)"
CWD="$(pwd)"

# Append structured event line to events.jsonl
command -v jq >/dev/null || { echo "WARN: jq not found, skipping audit JSON write"; exit 0; }
jq -cn --arg ts "$NOW" --arg cwd "$CWD" \
  '{schema_version:1, source:"plugin", event:"sessionEnd", timestamp:$ts, cwd:$cwd}' \
  >> .copilot-hooks/events.jsonl

# Append human-readable closing summary to session.log
printf 'source=plugin event=sessionEnd timestamp=%s cwd=%s\n' \
  "$NOW" "$CWD" >> .copilot-hooks/session.log

# Wave-C-3: prune notepad lanes (manual + working) older than 7 days at
# session end (per ADR-2). Priority lane is preserved by the store's
# default-lane behavior. Bridge errors absorbed; non-fatal.
if declare -f omcp_call_store >/dev/null; then
  omcp_call_store notepad-store notepadPrune '{"maxAgeDays":7}' >/dev/null
fi

exit 0
