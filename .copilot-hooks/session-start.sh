#!/usr/bin/env bash
set -euo pipefail

mkdir -p .copilot-hooks
printf 'source=root-workspace event=sessionStart timestamp=%s cwd=%s\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  "$(pwd)" >> .copilot-hooks/session.log
