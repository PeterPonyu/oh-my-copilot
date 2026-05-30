#!/usr/bin/env bash
set -euo pipefail

ROOT="."

log() { printf 'ok: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

require_file() {
  [[ -f "$ROOT/$1" ]] || fail "missing required file: $1"
}

require_exec() {
  [[ -x "$ROOT/$1" ]] || fail "missing executable bit: $1"
}

require_contains() {
  local description="$1"
  local pattern="$2"
  shift 2
  if ! grep -Eiq -- "$pattern" "$@"; then
    fail "$description"
  fi
  log "$description"
}

validate_vscode_layout() {
  local path
  for path in \
    examples/vscode-copilot-layout/README.md \
    examples/vscode-copilot-layout/PROOF-CHECKLIST.md \
    examples/vscode-copilot-layout/AGENTS.md \
    examples/vscode-copilot-layout/.vscode/settings.json \
    examples/vscode-copilot-layout/.github/copilot-instructions.md \
    examples/vscode-copilot-layout/.github/instructions/typescript.instructions.md \
    examples/vscode-copilot-layout/.github/prompts/ship-docs.prompt.md \
    examples/vscode-copilot-layout/.github/prompts/review-scope.prompt.md \
    examples/vscode-copilot-layout/.github/agents/planner.agent.md \
    examples/vscode-copilot-layout/.github/agents/implementer.agent.md \
    examples/vscode-copilot-layout/.github/agents/reviewer.agent.md \
    examples/vscode-copilot-layout/.github/agents/verifier.agent.md \
    examples/vscode-copilot-layout/.github/skills/parity-guard/SKILL.md \
    examples/vscode-copilot-layout/.github/skills/parity-guard/check-parity-claims.sh \
    examples/vscode-copilot-layout/.github/skills/docs-ship/SKILL.md \
    examples/vscode-copilot-layout/.github/skills/docs-ship/run-docs-checks.sh \
    examples/vscode-copilot-layout/.github/hooks/hooks.json \
    examples/vscode-copilot-layout/.copilot-hooks/common.sh \
    examples/vscode-copilot-layout/.copilot-hooks/.gitkeep \
    examples/vscode-copilot-layout/.copilot-hooks/session-start.sh \
    examples/vscode-copilot-layout/.copilot-hooks/post-tool-audit.sh \
    examples/vscode-copilot-layout/src/sample.ts \
    examples/vscode-copilot-layout/src/sample.tsx
  do
    require_file "$path"
  done

  require_exec "examples/vscode-copilot-layout/.github/skills/parity-guard/check-parity-claims.sh"
  require_exec "examples/vscode-copilot-layout/.github/skills/docs-ship/run-docs-checks.sh"
  require_exec "examples/vscode-copilot-layout/.copilot-hooks/common.sh"
  require_exec "examples/vscode-copilot-layout/.copilot-hooks/session-start.sh"
  require_exec "examples/vscode-copilot-layout/.copilot-hooks/post-tool-audit.sh"

  require_contains "planner agent hands off to implementer" 'agent:\s*implementer' \
    "$ROOT/examples/vscode-copilot-layout/.github/agents/planner.agent.md"
  require_contains "implementer agent hands off to reviewer" 'agent:\s*reviewer' \
    "$ROOT/examples/vscode-copilot-layout/.github/agents/implementer.agent.md"
  require_contains "reviewer agent hands off to verifier" 'agent:\s*verifier' \
    "$ROOT/examples/vscode-copilot-layout/.github/agents/reviewer.agent.md"
  require_contains "VS Code hook policy uses native SessionStart event" '"SessionStart"' \
    "$ROOT/examples/vscode-copilot-layout/.github/hooks/hooks.json"
  require_contains "VS Code hook policy uses native PostToolUse event" '"PostToolUse"' \
    "$ROOT/examples/vscode-copilot-layout/.github/hooks/hooks.json"
  require_contains "VS Code settings enable AGENTS.md loading" 'chat\.useAgentsMdFile' \
    "$ROOT/examples/vscode-copilot-layout/.vscode/settings.json"
  require_contains "VS Code settings enable skills" 'chat\.useAgentSkills' \
    "$ROOT/examples/vscode-copilot-layout/.vscode/settings.json"
  require_contains "VS Code prompt file uses a custom agent" 'agent:\s*(planner|reviewer)' \
    "$ROOT/examples/vscode-copilot-layout/.github/prompts/ship-docs.prompt.md" \
    "$ROOT/examples/vscode-copilot-layout/.github/prompts/review-scope.prompt.md"
}

validate_cli_plugin() {
  local path
  for path in \
    packages/copilot-cli-plugin/README.md \
    packages/copilot-cli-plugin/plugin.json \
    packages/copilot-cli-plugin/hooks.json \
    packages/copilot-cli-plugin/instructions/AGENTS.md \
    packages/copilot-cli-plugin/instructions/copilot-instructions.md \
    packages/copilot-cli-plugin/agents/research.agent.md \
    packages/copilot-cli-plugin/agents/reviewer.agent.md \
    packages/copilot-cli-plugin/agents/verifier.agent.md \
    packages/copilot-cli-plugin/skills/parity-guard/SKILL.md \
    packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh \
    packages/copilot-cli-plugin/skills/docs-ship/SKILL.md \
    packages/copilot-cli-plugin/skills/docs-ship/run-docs-checks.sh \
    packages/copilot-cli-plugin/scripts/log-session-start.sh \
    packages/copilot-cli-plugin/scripts/post-tool-audit.sh \
    scripts/check-mirror-drift.sh \
    scripts/validate-plugin-orchestration.mjs \
    scripts/bootstrap-copilot-power.sh
  do
    require_file "$path"
  done

  require_exec "packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh"
  require_exec "packages/copilot-cli-plugin/skills/docs-ship/run-docs-checks.sh"
  require_exec "packages/copilot-cli-plugin/scripts/log-session-start.sh"
  require_exec "packages/copilot-cli-plugin/scripts/post-tool-audit.sh"
  require_exec "scripts/check-mirror-drift.sh"
  require_exec "scripts/validate-plugin-orchestration.mjs"
  require_exec "scripts/bootstrap-copilot-power.sh"

  python3 - "$ROOT/packages/copilot-cli-plugin/plugin.json" <<'PY'
import json, pathlib, sys
data = json.loads(pathlib.Path(sys.argv[1]).read_text())
required = {"name", "version", "agents", "skills", "hooks"}
missing = required - data.keys()
if missing:
    raise SystemExit(f"missing plugin.json keys: {sorted(missing)}")
PY
  log "plugin.json parses and includes core keys"
  python3 - "$ROOT/packages/copilot-cli-plugin/hooks.json" <<'PY'
import json, pathlib, sys
data = json.loads(pathlib.Path(sys.argv[1]).read_text())
if data.get("version") != 1:
    raise SystemExit("hooks.json must have version: 1")
PY
  log "plugin hooks.json has versioned schema"
  (cd "$ROOT" && ./scripts/check-mirror-drift.sh >/dev/null)
  log "root Copilot mirror has no drift from plugin sources"
  (cd "$ROOT" && node scripts/validate-plugin-orchestration.mjs >/dev/null)
  log "plugin orchestration metadata validates"
  (cd "$ROOT" && node scripts/validate-surface-inventory.mjs >/dev/null)
  log "surface inventory validates"
}

validate_docs_mentions() {
  require_contains "README mentions VS Code layout" 'vscode-copilot-layout|VS Code' \
    "$ROOT/README.md" "$ROOT/docs/vscode-copilot-testing.md"
  require_contains "README mentions Copilot CLI plugin package" 'copilot-cli-plugin|plugin package|plugins/' \
    "$ROOT/README.md"
  python3 - "$ROOT/README.md" <<'PY'
from __future__ import annotations
import pathlib
import sys

text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
required = [
    "docs/refinement-priority-map.md",
    "docs/plugin-boundary-review.md",
    "docs/benchmark-status.md",
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit(f"FAIL: README is missing required discoverability links: {missing}")
print("ok: README exposes refinement-priority, plugin-boundary, and benchmark-status links")
PY
  log "REFINEMENT_MAP_OK"
  log "PLUGIN_BOUNDARY_OK"
  log "DISCOVERABILITY_OK"
}

validate_cross_host_benchmark_site() {
  local path
  for path in \
    scripts/harvest-cross-host-benchmark-data.mjs \
    scripts/validate-cross-host-benchmark-data.mjs \
    apps/cross-host-benchmark-site/package.json \
    apps/cross-host-benchmark-site/app/layout.tsx \
    apps/cross-host-benchmark-site/app/page.tsx \
    apps/cross-host-benchmark-site/app/methodology/page.tsx \
    apps/cross-host-benchmark-site/app/history/page.tsx \
    apps/cross-host-benchmark-site/src/lib/adapters/copilot.ts \
    apps/cross-host-benchmark-site/src/lib/adapters/cursor.ts \
    apps/cross-host-benchmark-site/src/lib/generated.ts \
    apps/cross-host-benchmark-site/src/lib/presentation/contracts.ts \
    apps/cross-host-benchmark-site/src/lib/presentation/primitives.ts \
    apps/cross-host-benchmark-site/generated/manifest.json \
    apps/cross-host-benchmark-site/generated/copilot-snapshots.json \
    apps/cross-host-benchmark-site/generated/cursor-snapshots.json
  do
    require_file "$path"
  done

  require_contains "cross-host app overview preserves isolated presentation boundary" \
    'isolated presentation boundary|reporting-comparable|repo-native' \
    "$ROOT/apps/cross-host-benchmark-site/app/page.tsx"
  require_contains "cross-host methodology route names comparability classes" \
    'reporting-comparable|outcome-comparable|not-comparable' \
    "$ROOT/apps/cross-host-benchmark-site/app/methodology/page.tsx"
  require_contains "cross-host presentation primitives preserve repo-native warning" \
    'reporting-comparable|repo-native|mechanism-equivalent' \
    "$ROOT/apps/cross-host-benchmark-site/src/lib/presentation/primitives.ts"

  node "$ROOT/scripts/validate-cross-host-benchmark-data.mjs" --app-root "$ROOT/apps/cross-host-benchmark-site" >/dev/null
  log "cross-host benchmark site files exist and generated data validates"
}

validate_manifest_counts() {
  # Per Critic A8: derive expected agent/skill/command/hook/mcp counts dynamically
  # from plugin.json rather than hard-coding magic numbers.
  python3 - "$ROOT/packages/copilot-cli-plugin/plugin.json" <<'PY'
from __future__ import annotations
import json
import pathlib
import sys

plugin_json = pathlib.Path(sys.argv[1]).resolve()
plugin_root = plugin_json.parent
data = json.loads(plugin_json.read_text(encoding="utf-8"))


def fail(msg: str) -> None:
    raise SystemExit(f"FAIL: manifest count — {msg}")


def ok(msg: str) -> None:
    print(f"ok: {msg}")


# --- Agents: count *.agent.md files under the agents path ---
agents_rel = data.get("agents", "agents")
agents_dir = plugin_root / str(agents_rel)
if not agents_dir.is_dir():
    fail(f"agents directory missing: {agents_dir}")
agent_files = list(agents_dir.glob("*.agent.md"))
if len(agent_files) < 15:
    fail(
        f"expected >=15 agent files in {agents_rel}, found {len(agent_files)}: "
        + ", ".join(sorted(f.name for f in agent_files))
    )
ok(f"manifest agents count {len(agent_files)} >= 15")

# --- Skills: count subdirs containing SKILL.md ---
skills_value = data.get("skills", [])
if isinstance(skills_value, str):
    skills_roots = [skills_value]
elif isinstance(skills_value, list):
    skills_roots = [str(s) for s in skills_value]
else:
    fail("skills field must be a string or list")

skill_count = 0
for skills_rel in skills_roots:
    skills_dir = plugin_root / skills_rel
    if not skills_dir.is_dir():
        fail(f"skills directory missing: {skills_dir}")
    skill_count += sum(1 for _ in skills_dir.glob("*/SKILL.md"))

if skill_count < 30:
    fail(f"expected >=30 skill subdirs with SKILL.md across skills paths, found {skill_count}")
ok(f"manifest skills count {skill_count} >= 30")

# --- Commands: count *.md files under the commands path (if present) ---
commands_rel = data.get("commands")
if commands_rel:
    commands_dir = plugin_root / str(commands_rel)
    if commands_dir.is_dir():
        command_files = list(commands_dir.glob("*.md"))
        if len(command_files) < 3:
            fail(f"expected >=3 command files in {commands_rel}, found {len(command_files)}")
        ok(f"manifest commands count {len(command_files)} >= 3")
    else:
        fail(f"commands directory missing: {commands_dir}")
else:
    ok("no commands path in plugin.json; count check skipped")

# --- Hooks: parse hooks.json and count event keys ---
hooks_value = data.get("hooks")
if not hooks_value:
    fail("hooks field missing from plugin.json")
hooks_path = plugin_root / str(hooks_value)
if not hooks_path.is_file():
    fail(f"hooks file missing: {hooks_path}")
hooks_data = json.loads(hooks_path.read_text(encoding="utf-8"))
hook_events = hooks_data.get("hooks", {})
if not isinstance(hook_events, dict):
    fail("hooks.json must have object key: hooks")
if len(hook_events) < 4:
    fail(f"expected >=4 hook event keys in hooks.json, found {len(hook_events)}: {sorted(hook_events)}")
ok(f"manifest hook events count {len(hook_events)} >= 4")

# --- MCP servers: accept inline object/list OR string path to a config file ---
mcp_servers = data.get("mcpServers")
if mcp_servers is not None:
    if isinstance(mcp_servers, str):
        # String form: path to a .mcp.json file (relative to plugin root)
        mcp_path = (plugin_root / mcp_servers).resolve()
        if not mcp_path.exists():
            fail(f"mcpServers points to {mcp_servers} which does not exist at {mcp_path}")
        try:
            mcp_data = json.loads(mcp_path.read_text())
        except Exception as e:
            fail(f"mcpServers config file is not valid JSON: {e}")
        servers = mcp_data.get("mcpServers")
        if not isinstance(servers, dict) or len(servers) < 1:
            fail("referenced mcpServers config has no servers; expected at least one")
        ok(f"manifest mcpServers (via {mcp_servers}) count {len(servers)} >= 1")
    elif isinstance(mcp_servers, (dict, list)):
        count = len(mcp_servers)
        if count < 1:
            fail("mcpServers is present but empty; expected at least one server entry")
        ok(f"manifest mcpServers count {count} >= 1")
    else:
        fail("mcpServers must be a string path, object, or list")
else:
    ok("no mcpServers in plugin.json; MCP count check skipped")

print("ok: manifest counts validated — agents/skills/hooks meet minimum thresholds")
PY
  log "validate counts match manifest"
}

validate_vscode_layout
validate_cli_plugin
validate_docs_mentions
validate_cross_host_benchmark_site
validate_manifest_counts
log "power surfaces validation complete"
