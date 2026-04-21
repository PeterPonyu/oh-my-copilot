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
    packages/copilot-cli-plugin/agents/research.agent.md \
    packages/copilot-cli-plugin/agents/reviewer.agent.md \
    packages/copilot-cli-plugin/agents/verifier.agent.md \
    packages/copilot-cli-plugin/skills/parity-guard/SKILL.md \
    packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh \
    packages/copilot-cli-plugin/skills/docs-ship/SKILL.md \
    packages/copilot-cli-plugin/skills/docs-ship/run-docs-checks.sh \
    packages/copilot-cli-plugin/scripts/log-session-start.sh \
    packages/copilot-cli-plugin/scripts/post-tool-audit.sh \
    scripts/bootstrap-copilot-power.sh
  do
    require_file "$path"
  done

  require_exec "packages/copilot-cli-plugin/skills/parity-guard/check-parity-claims.sh"
  require_exec "packages/copilot-cli-plugin/skills/docs-ship/run-docs-checks.sh"
  require_exec "packages/copilot-cli-plugin/scripts/log-session-start.sh"
  require_exec "packages/copilot-cli-plugin/scripts/post-tool-audit.sh"
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
}

validate_docs_mentions() {
  require_contains "README mentions VS Code layout" 'vscode-copilot-layout|VS Code' \
    "$ROOT/README.md" "$ROOT/docs/vscode-copilot-testing.md"
  require_contains "README mentions Copilot CLI plugin package" 'copilot-cli-plugin|plugin package|plugins/' \
    "$ROOT/README.md"
}

validate_cross_host_benchmark_site() {
  local path
  for path in \
    scripts/harvest-cross-host-benchmark-data.py \
    scripts/validate-cross-host-benchmark-data.py \
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

  python3 "$ROOT/scripts/validate-cross-host-benchmark-data.py" --app-root "$ROOT/apps/cross-host-benchmark-site" >/dev/null
  log "cross-host benchmark site files exist and generated data validates"
}

validate_vscode_layout
validate_cli_plugin
validate_docs_mentions
validate_cross_host_benchmark_site
log "power surfaces validation complete"
