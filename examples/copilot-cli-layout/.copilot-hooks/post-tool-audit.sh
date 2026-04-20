#!/usr/bin/env bash
set -euo pipefail

mkdir -p .copilot-hooks
printf 'postToolUse: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .copilot-hooks/tools.log

if [[ -x ./.github/skills/ecosystem-compare/check-parity-claims.sh ]]; then
  if ! ./.github/skills/ecosystem-compare/check-parity-claims.sh . >> .copilot-hooks/tools.log 2>&1; then
    printf 'scope warning: parity-guard failed at %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .copilot-hooks/warnings.log
    exit 1
  fi
fi
