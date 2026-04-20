#!/usr/bin/env bash
set -euo pipefail

# VS Code hooks send JSON on stdin. This workspace hook only logs, so it
# drains stdin and returns an explicit continue result.
cat >/dev/null || true

mkdir -p .copilot-hooks
printf 'session started: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> .copilot-hooks/session.log
printf 'workspace: %s\n' "$(pwd)" >> .copilot-hooks/session.log
printf '{"continue":true}\n'
