#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${COPILOT_CONFIG_PATH:-$HOME/.copilot/config.json}"

usage() {
  cat <<'USAGE'
Usage: scripts/check-install-state.sh [--root PATH] [--config PATH]

Verifies the local oh-my-copilot Copilot CLI plugin installation state:
  - copilot CLI is available
  - package manifest is valid
  - ~/.copilot/config.json contains the plugin entry
  - the installed plugin cache path exists and contains the expected surfaces
  - the installed plugin source path points at the canonical root plugin path,
    not a transient team/worktree checkout

The script is read-only and safe to run after bootstrap or during release
checks. Set COPILOT_CONFIG_PATH to override the default config path.
USAGE
}

log() { printf 'ok: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
report() { printf '%s\n' "$*"; }

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

ROOT="$(python3 "$ROOT/scripts/resolve-canonical-root.py" "$ROOT")"
PLUGIN_PATH="$ROOT/packages/copilot-cli-plugin"
PLUGIN_JSON="$PLUGIN_PATH/plugin.json"

command -v copilot >/dev/null 2>&1 || fail "copilot CLI not found"
command -v python3 >/dev/null 2>&1 || fail "python3 not found"

log "copilot CLI detected at $(command -v copilot)"

python3 - "$ROOT" "$PLUGIN_JSON" "$CONFIG_PATH" <<'PY'
from __future__ import annotations

import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
plugin_json = pathlib.Path(sys.argv[2]).resolve()
config_path = pathlib.Path(sys.argv[3]).expanduser().resolve()


def fail(message: str) -> None:
    raise SystemExit(f"FAIL: {message}")


def ok(message: str) -> None:
    print(f"ok: {message}")


if not plugin_json.is_file():
    fail(f"plugin manifest missing: {plugin_json.relative_to(root)}")

try:
    manifest = json.loads(plugin_json.read_text(encoding="utf-8"))
except json.JSONDecodeError as exc:
    fail(f"plugin manifest is not valid JSON: {exc}")

plugin_name = manifest.get("name")
if plugin_name != "oh-my-copilot-power-pack":
    fail(f"unexpected plugin name: {plugin_name!r}")
if not manifest.get("version"):
    fail("plugin manifest missing version")

agents_path = plugin_json.parent / str(manifest.get("agents", ""))
if not agents_path.is_dir():
    fail(f"plugin agents directory missing: {agents_path}")

skill_roots = manifest.get("skills")
if not isinstance(skill_roots, list) or not skill_roots:
    fail("plugin manifest must include at least one skills directory")
for skill_root in skill_roots:
    skill_root_path = plugin_json.parent / str(skill_root)
    if not skill_root_path.is_dir():
        fail(f"plugin skills directory missing: {skill_root_path}")
    if not any(skill_root_path.glob("*/SKILL.md")):
        fail(f"plugin skills directory has no SKILL.md files: {skill_root_path}")

hooks_value = manifest.get("hooks")
hooks_path = plugin_json.parent / str(hooks_value or "")
if not hooks_value or not hooks_path.is_file():
    fail(f"plugin hooks file missing: {hooks_path}")
json.loads(hooks_path.read_text(encoding="utf-8"))
ok(f"package manifest is valid for {plugin_name} {manifest['version']}")

if not config_path.is_file():
    fail(f"Copilot config missing: {config_path}")
try:
    config = json.loads(config_path.read_text(encoding="utf-8"))
except json.JSONDecodeError as exc:
    fail(f"Copilot config is not valid JSON: {exc}")

installed = config.get("installedPlugins")
if not isinstance(installed, list):
    fail("Copilot config missing installedPlugins list")

entry = next((item for item in installed if item.get("name") == plugin_name), None)
if not entry:
    fail(f"{plugin_name} not found in installedPlugins")

if entry.get("enabled") is False:
    fail(f"{plugin_name} is installed but disabled")

if entry.get("version") != manifest["version"]:
    fail(
        f"installed version {entry.get('version')!r} does not match package version "
        f"{manifest['version']!r}"
    )

cache_path_raw = entry.get("cache_path")
if not cache_path_raw:
    fail(f"{plugin_name} entry missing cache_path")
cache_path = pathlib.Path(cache_path_raw).expanduser()
if not cache_path.is_dir():
    fail(f"installed plugin cache path missing: {cache_path}")

cached_manifest_path = cache_path / "plugin.json"
if not cached_manifest_path.is_file():
    fail(f"installed plugin cache missing plugin.json: {cached_manifest_path}")
cached_manifest = json.loads(cached_manifest_path.read_text(encoding="utf-8"))
if cached_manifest.get("name") != plugin_name:
    fail(f"installed cache plugin name mismatch: {cached_manifest.get('name')!r}")

for required in ("agents", "skills", "hooks.json"):
    if not (cache_path / required).exists():
        fail(f"installed plugin cache missing {required}: {cache_path / required}")

source = entry.get("source")
if isinstance(source, dict) and source.get("path"):
    source_path = pathlib.Path(str(source["path"])).expanduser()
    source_resolved = source_path.resolve()
    if not source_resolved.exists():
        fail(f"installed source path is recorded but unavailable: {source_resolved}")
    source_str = str(source_resolved)
    if "/.omx/team/" in source_str or "/worktrees/" in source_str:
        fail(
            "installed plugin source path points to a transient OMX team/worktree checkout: "
            f"{source_resolved}"
        )
    canonical_plugin_root = plugin_json.parent.resolve()
    try:
        same_source = source_resolved.samefile(canonical_plugin_root)
    except FileNotFoundError:
        same_source = False
    if not same_source:
        fail(
            "installed plugin source path is not the canonical root plugin path: "
            f"{source_resolved} != {canonical_plugin_root}"
        )
    ok(f"installed source path is canonical: {source_resolved}")
else:
    fail(f"{plugin_name} entry missing canonical local source.path metadata")

ok(f"plugin config entry found in {config_path}")
ok(f"installed plugin cache verified at {cache_path}")
print("INSTALL_STATE: ok")
PY

report ""
report "INSTALL_STATE_SUMMARY"
report "====================="
report "- Root: $ROOT"
report "- Plugin manifest: $PLUGIN_JSON"
report "- Copilot config: $CONFIG_PATH"
report "- Expected plugin name: oh-my-copilot-power-pack"
report "- Result: PASS"
