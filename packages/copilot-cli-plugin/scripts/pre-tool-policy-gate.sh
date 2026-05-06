#!/usr/bin/env bash
# pre-tool-policy-gate.sh — Wave 2, Hook: preToolUse
#
# Stdin/env contract (Wave 0):
#   stdin  : JSON tool-use payload from the harness
#   stdout : JSON decision: {"continue": true} or {"continue": false, "reason": "<msg>"}
#   exit 0 : always (non-zero would crash the hook chain)
#
# Limitations (regex-only, no AST stage in v1):
#   - Variable indirection ($CRED, ${!VAR}) is NOT detected
#   - Base64-decoded payloads are NOT decoded before matching
#   - eval-wrapped strings are NOT unwrapped before matching
#   Treat this as a best-effort trip-wire, not a security boundary.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMON_SH=".copilot-hooks/common.sh"
PATTERNS_FILE="${SCRIPT_DIR}/policy-patterns.txt"
WARNINGS_LOG=".copilot-hooks/warnings.log"

# Source common helpers if present (graceful no-op if missing)
if [ -f "$COMMON_SH" ]; then
  # shellcheck source=/dev/null
  source "$COMMON_SH"
fi

mkdir -p .copilot-hooks

# Capture stdin payload — use helper if loaded, else fall back to cat
if declare -f copilot_hook_capture_stdin >/dev/null 2>&1; then
  copilot_hook_capture_stdin
  PAYLOAD="${COPILOT_HOOK_STDIN:-}"
else
  PAYLOAD="$(cat -)"
fi

# Truncate payload for log lines (keep first 200 chars)
PAYLOAD_TRUNC="${PAYLOAD:0:200}"

# Skip policy check if patterns file is missing
if [ ! -f "$PATTERNS_FILE" ]; then
  printf '{"continue": true}\n'
  exit 0
fi

NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date +%Y-%m-%dT%H:%M:%SZ)"

# Read patterns file line by line; skip blank lines and comments
while IFS= read -r pattern || [ -n "$pattern" ]; do
  # Skip empty lines and comment lines
  [[ -z "$pattern" || "$pattern" == \#* ]] && continue

  # grep returns 0 on match, 1 on no-match, 2 on error
  if echo "$PAYLOAD" | grep -qE "$pattern" 2>/dev/null; then
    # Emit block decision to stdout
    printf '{"continue": false, "reason": "%s"}\n' \
      "$(printf '%s' "$pattern" | sed 's/"/\\"/g')"

    # Append warning to log
    printf '%s policy-gate BLOCKED pattern=%s payload_trunc=%s\n' \
      "$NOW" "$pattern" "$PAYLOAD_TRUNC" >> "$WARNINGS_LOG"

    exit 0
  fi
done < "$PATTERNS_FILE"

printf '{"continue": true}\n'
exit 0
