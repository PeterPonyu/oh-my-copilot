#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_PATH="$ROOT/packages/copilot-cli-plugin"

log() { printf 'ok: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

command -v copilot >/dev/null 2>&1 || fail "copilot CLI not found"
command -v gh >/dev/null 2>&1 || fail "gh CLI not found"

log "copilot CLI detected"
log "gh CLI detected"

copilot plugin install "$PLUGIN_PATH" >/tmp/omc-plugin-install.out 2>&1 || true
tail -n 5 /tmp/omc-plugin-install.out || true

python3 - <<'PY'
from __future__ import annotations
import json
import pathlib

cfg = pathlib.Path.home() / ".copilot" / "config.json"
if not cfg.exists():
    raise SystemExit("FAIL: ~/.copilot/config.json missing after plugin install")
data = json.loads(cfg.read_text())
installed = data.get("installedPlugins", [])
for entry in installed:
    if entry.get("name") == "oh-my-copilot-power-pack":
        print("ok: plugin config entry found")
        break
else:
    raise SystemExit("FAIL: plugin config entry missing")
PY

( cd "$ROOT" && ./scripts/validate-doc-links.sh )
( cd "$ROOT" && ./scripts/validate-power-surfaces.sh )
( cd "$ROOT" && ./scripts/validate-root-copilot-surfaces.sh )
( cd "$ROOT" && ./scripts/prove-vscode-hook-standalone.sh )

log "bootstrap complete"
