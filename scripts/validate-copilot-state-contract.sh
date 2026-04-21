#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${COPILOT_CONFIG_PATH:-$HOME/.copilot/config.json}"

usage() {
  cat <<'USAGE'
Usage: scripts/validate-copilot-state-contract.sh [--root PATH] [--config PATH]

Validates the local state-management contract for oh-my-copilot:
  - the installed plugin entry points at the canonical root plugin path
  - plugin cache lives under ~/.copilot/installed-plugins
  - per-project hook/log config stays project-local when present
  - no transient .omx/team worktree path is treated as the canonical plugin source
USAGE
}

log() { printf 'ok: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

while (($#)); do
  case "$1" in
    --root)
      [[ $# -ge 2 ]] || fail "--root requires a path"
      ROOT="$(cd "$2" && pwd)"
      shift 2
      ;;
    --config)
      [[ $# -ge 2 ]] || fail "--config requires a path"
      CONFIG_PATH="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

command -v python3 >/dev/null 2>&1 || fail "python3 not found"

if [[ ! -f "$CONFIG_PATH" ]]; then
  log "no ~/.copilot/config.json present; local plugin state contract is skipped in this environment"
  exit 0
fi

installed_plugin_present="$(python3 - "$CONFIG_PATH" <<'PY'
from __future__ import annotations
import json
import pathlib
import sys

config_path = pathlib.Path(sys.argv[1]).expanduser().resolve()
cfg = json.loads(config_path.read_text(encoding="utf-8"))
entry = next(
    (item for item in cfg.get("installedPlugins", []) if item.get("name") == "oh-my-copilot-power-pack"),
    None,
)
print("yes" if entry else "no")
PY
)"

if [[ "$installed_plugin_present" != "yes" ]]; then
  log "no installed oh-my-copilot plugin entry in ~/.copilot/config.json; state contract is skipped in this environment"
  exit 0
fi

"$ROOT/scripts/check-install-state.sh" --root "$ROOT" --config "$CONFIG_PATH" >/dev/null
log "install-state validation passes"

python3 - "$ROOT" "$CONFIG_PATH" <<'PY'
from __future__ import annotations

import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
config_path = pathlib.Path(sys.argv[2]).expanduser().resolve()
hook_cfg = root / ".copilot-hooks" / "config.json"
plugin_root = (root / "packages" / "copilot-cli-plugin").resolve()


def fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def ok(message: str) -> None:
    print(f"ok: {message}")


cfg = json.loads(config_path.read_text(encoding="utf-8"))
entry = next(
    (item for item in cfg.get("installedPlugins", []) if item.get("name") == "oh-my-copilot-power-pack"),
    None,
)
if not entry:
    fail("installed plugin entry missing")

cache_path = pathlib.Path(entry["cache_path"]).expanduser().resolve()
home_plugins = pathlib.Path.home() / ".copilot" / "installed-plugins"
if home_plugins not in cache_path.parents:
    fail(f"plugin cache path is not under ~/.copilot/installed-plugins: {cache_path}")
ok(f"plugin cache path is user-global and outside the repo: {cache_path}")

source = entry.get("source") or {}
source_path = pathlib.Path(source.get("path", "")).expanduser().resolve()
if plugin_root != source_path:
    fail(f"plugin source path drifted from canonical repo plugin root: {source_path} != {plugin_root}")
ok(f"plugin source path is canonical root plugin path: {source_path}")

if hook_cfg.exists():
    hook_data = json.loads(hook_cfg.read_text(encoding="utf-8"))
    workspace_root = pathlib.Path(hook_data.get("workspace_root", "")).resolve()
    if workspace_root != root:
        fail(f"hook workspace_root drifted from repo root: {workspace_root} != {root}")
    ok(f"hook workspace_root stays project-local: {workspace_root}")
else:
    print("ok: no local .copilot-hooks/config.json yet; project-local hook config remains opt-in until generated")
PY

log "Copilot state contract validation complete"
