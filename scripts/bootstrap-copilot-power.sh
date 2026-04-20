#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_PATH="$ROOT/packages/copilot-cli-plugin"
INSTALL_LOG="$(mktemp)"
trap 'rm -f "$INSTALL_LOG"' EXIT

log() { printf 'ok: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

command -v copilot >/dev/null 2>&1 || fail "copilot CLI not found"
command -v python3 >/dev/null 2>&1 || fail "python3 not found"

log "copilot CLI detected"
log "python3 detected"

if copilot plugin install "$PLUGIN_PATH" >"$INSTALL_LOG" 2>&1; then
  log "copilot plugin install command completed"
else
  install_status=$?
  tail -n 20 "$INSTALL_LOG" || true
  if "$ROOT/scripts/check-install-state.sh" --root "$ROOT"; then
    log "copilot plugin install exited $install_status, but installed state is already valid"
  else
    fail "copilot plugin install failed and install state is invalid"
  fi
fi

tail -n 20 "$INSTALL_LOG" || true
"$ROOT/scripts/check-install-state.sh" --root "$ROOT"

( cd "$ROOT" && ./scripts/validate-doc-links.sh )
( cd "$ROOT" && ./scripts/validate-power-surfaces.sh )
( cd "$ROOT" && ./scripts/validate-root-copilot-surfaces.sh )
( cd "$ROOT" && ./scripts/prove-vscode-hook-standalone.sh )

log "bootstrap complete"
