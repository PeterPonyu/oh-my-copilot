#!/usr/bin/env bash
set -euo pipefail

mkdir -p .copilot-hooks
printf 'session started: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .copilot-hooks/session.log
printf 'cwd: %s\n' "$(pwd)" >> .copilot-hooks/session.log
