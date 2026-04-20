#!/usr/bin/env bash
set -euo pipefail

# Validate root-level Copilot registration surfaces. This catches drift between
# the root workspace, reusable CLI plugin package, and illustrative examples.

ROOT="."
SELF_TEST=0

usage() {
  cat <<'USAGE'
Usage: scripts/validate-root-copilot-surfaces.sh [--root PATH] [--self-test]

Checks the repository root Copilot registration surface for:
  - required root instructions, agents, prompts, skills, hooks, and hook scripts
  - prompt and agent handoff references that resolve to root-local agents
  - root hook policy JSON and script executability
  - root/plugin/example boundary wording so reusable plugin assets stay canonical

Use --self-test to validate the checker against a generated minimal fixture.
USAGE
}

log() { printf 'ok: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

while (($#)); do
  case "$1" in
    --root)
      [[ $# -ge 2 ]] || fail "--root requires a path"
      ROOT="$2"
      shift 2
      ;;
    --self-test)
      SELF_TEST=1
      shift
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

required_root_files=(
  AGENTS.md
  .github/copilot-instructions.md
  .github/instructions/docs.instructions.md
  .github/instructions/copilot-surfaces.instructions.md
  .github/instructions/scripts.instructions.md
  .github/agents/research.agent.md
  .github/agents/reviewer.agent.md
  .github/agents/verifier.agent.md
  .github/prompts/ship-docs.prompt.md
  .github/prompts/review-scope.prompt.md
  .github/prompts/root-registration-check.prompt.md
  .github/skills/docs-ship/SKILL.md
  .github/skills/parity-guard/SKILL.md
  .github/hooks/hooks.json
  .copilot-hooks/session-start.sh
  .copilot-hooks/post-tool-audit.sh
)

contains() {
  local pattern="$1"
  shift
  (cd "$ROOT" && grep -Eiq -- "$pattern" "$@")
}

require_file() {
  local path="$1"
  [[ -f "$ROOT/$path" ]] || fail "missing required root file: $path"
}

require_exec() {
  local path="$1"
  [[ -x "$ROOT/$path" ]] || fail "missing executable bit: $path"
}

require_contains() {
  local description="$1"
  local pattern="$2"
  shift 2
  contains "$pattern" "$@" || fail "$description"
  log "$description"
}

validate_required_files() {
  local path
  for path in "${required_root_files[@]}"; do
    require_file "$path"
  done
  require_exec .copilot-hooks/session-start.sh
  require_exec .copilot-hooks/post-tool-audit.sh
  log "all required root Copilot files exist"
}

validate_instructions() {
  local path
  for path in \
    .github/instructions/docs.instructions.md \
    .github/instructions/copilot-surfaces.instructions.md \
    .github/instructions/scripts.instructions.md
  do
    require_contains "$path has frontmatter" '^---$' "$path"
  done

  require_contains "root copilot instructions state CLI-first boundary" 'CLI-first|Copilot CLI-first' \
    AGENTS.md .github/copilot-instructions.md
  require_contains "root copilot instructions reject parity cloning" 'no .*parity|not .*parity|avoid.*parity|non-goal|non-goals' \
    AGENTS.md .github/copilot-instructions.md
}

validate_agent_and_prompt_wiring() {
  python3 - "$ROOT" <<'PY'
from __future__ import annotations
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
errors: list[str] = []

required_agents = {"research", "reviewer", "verifier"}
agent_dir = root / ".github" / "agents"
prompt_dir = root / ".github" / "prompts"


def read(path: pathlib.Path) -> str:
    return path.read_text(encoding="utf-8")


def frontmatter(path: pathlib.Path) -> dict[str, str]:
    text = read(path)
    if not text.startswith("---\n"):
        errors.append(f"{path.relative_to(root)}: missing YAML frontmatter")
        return {}
    end = text.find("\n---", 4)
    if end == -1:
        errors.append(f"{path.relative_to(root)}: unterminated YAML frontmatter")
        return {}
    data: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if not line.strip() or line.lstrip().startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip().strip('"\'')
    body = text[end + 4 :].strip()
    if not body:
        errors.append(f"{path.relative_to(root)}: empty body")
    return data

for name in required_agents:
    path = agent_dir / f"{name}.agent.md"
    data = frontmatter(path)
    if data.get("name") != name:
        errors.append(f"{path.relative_to(root)}: frontmatter name must be {name!r}")
    if not data.get("description"):
        errors.append(f"{path.relative_to(root)}: missing description")

for path in sorted(prompt_dir.glob("*.prompt.md")):
    data = frontmatter(path)
    agent = data.get("agent")
    if not agent:
        errors.append(f"{path.relative_to(root)}: missing agent frontmatter")
        continue
    if ":" in agent:
        errors.append(f"{path.relative_to(root)}: prompt must use root-local agent, not namespaced {agent!r}")
    if not (agent_dir / f"{agent}.agent.md").is_file():
        errors.append(f"{path.relative_to(root)}: agent {agent!r} has no root agent file")

agent_ref_re = re.compile(r"^\s*agent:\s*([A-Za-z0-9_.:-]+)\s*$", re.M)
for path in sorted(agent_dir.glob("*.agent.md")):
    text = read(path)
    for agent in agent_ref_re.findall(text):
        if ":" in agent:
            errors.append(f"{path.relative_to(root)}: handoff must use root-local agent, not namespaced {agent!r}")
        if not (agent_dir / f"{agent}.agent.md").is_file():
            errors.append(f"{path.relative_to(root)}: handoff agent {agent!r} has no root agent file")

if errors:
    print("Root prompt/agent wiring FAILED", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    sys.exit(1)
PY
  log "root prompt and agent wiring resolves"
}

validate_skills() {
  python3 - "$ROOT" <<'PY'
from __future__ import annotations
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
errors: list[str] = []
for name in ("docs-ship", "parity-guard"):
    path = root / ".github" / "skills" / name / "SKILL.md"
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        errors.append(f"{path.relative_to(root)}: missing YAML frontmatter")
    if f"name: {name}" not in text:
        errors.append(f"{path.relative_to(root)}: missing name: {name}")
    if "description:" not in text:
        errors.append(f"{path.relative_to(root)}: missing description")
    if "examples/vscode-copilot-layout" in text or "examples/copilot-cli-layout" in text:
        errors.append(f"{path.relative_to(root)}: root skill must not route through example workspaces")

if errors:
    print("Root skill validation FAILED", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    sys.exit(1)
PY
  require_contains "docs-ship skill references root docs validation" 'scripts/validate-doc-links\.sh' \
    .github/skills/docs-ship/SKILL.md
  require_contains "docs-ship skill references root surface validation" 'scripts/validate-root-copilot-surfaces\.sh' \
    .github/skills/docs-ship/SKILL.md
  require_contains "parity-guard skill preserves non-parity boundary" 'parity|scope|over-scope|OMC|OMX' \
    .github/skills/parity-guard/SKILL.md
  log "root skills are root-relative"
}

validate_hooks() {
  python3 - "$ROOT/.github/hooks/hooks.json" <<'PY'
from __future__ import annotations
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
hooks = data.get("hooks")
if not isinstance(hooks, dict):
    raise SystemExit("hooks.json must contain object key: hooks")

def event(*names: str):
    for name in names:
        if name in hooks:
            return hooks[name]
    raise SystemExit(f"hooks.json missing event: {'/'.join(names)}")

session = event("sessionStart", "SessionStart")
post_tool = event("postToolUse", "PostToolUse")
serialized_session = json.dumps(session)
serialized_post_tool = json.dumps(post_tool)
if ".copilot-hooks/session-start.sh" not in serialized_session:
    raise SystemExit("sessionStart hook must call .copilot-hooks/session-start.sh")
if ".copilot-hooks/post-tool-audit.sh" not in serialized_post_tool:
    raise SystemExit("postToolUse hook must call .copilot-hooks/post-tool-audit.sh")
PY
  log "root hook policy parses and calls root scripts"
  require_contains "session hook logs root-workspace source" 'root-workspace|source=root' \
    .copilot-hooks/session-start.sh
  require_contains "post-tool hook logs root-workspace source" 'root-workspace|source=root' \
    .copilot-hooks/post-tool-audit.sh
}

validate_boundary_docs() {
  require_contains "README distinguishes root workspace from plugin/example surfaces" \
    'root workspace|root registration|current directory' README.md
  require_contains "README mentions reusable plugin package" \
    'plugin package|copilot-cli-plugin|reusable.*plugin' README.md
  require_contains "README keeps examples illustrative" \
    'examples?.*illustrative|illustrative.*examples?' README.md

  if [[ -f "$ROOT/docs/root-registration.md" ]]; then
    require_contains "root registration doc states plugin canonicality" \
      'plugin.*canonical|canonical.*plugin|reusable.*plugin' docs/root-registration.md
    require_contains "root registration doc keeps examples as examples" \
      'examples?.*examples?|illustrative|smoke-test|template' docs/root-registration.md
  else
    log "docs/root-registration.md absent; README boundary checks used"
  fi
}

validate_ci_wiring() {
  require_contains "CI runs root Copilot surface validation" \
    'validate-root-copilot-surfaces\.sh' .github/workflows/docs-check.yml
}

validate_repo() {
  validate_required_files
  validate_instructions
  validate_agent_and_prompt_wiring
  validate_skills
  validate_hooks
  validate_boundary_docs
  validate_ci_wiring
  log "root Copilot surface validation complete"
}

create_self_test_fixture() {
  local dir="$1"
  mkdir -p \
    "$dir/docs" \
    "$dir/.github/instructions" \
    "$dir/.github/agents" \
    "$dir/.github/prompts" \
    "$dir/.github/skills/docs-ship" \
    "$dir/.github/skills/parity-guard" \
    "$dir/.github/hooks" \
    "$dir/.copilot-hooks"

  cat > "$dir/README.md" <<'MD'
# Root registration fixture

This current directory is a root workspace for Copilot. The reusable plugin package remains canonical for reusable plugin distribution, and examples are illustrative examples rather than root proof. The repo is CLI-first and avoids parity claims.
MD
  cat > "$dir/docs/root-registration.md" <<'MD'
# Root Registration

The plugin package is canonical for reusable assets. Examples remain illustrative smoke-test workspaces.
MD
  cat > "$dir/AGENTS.md" <<'MD'
# Root AGENTS

Root workspace instructions are CLI-first and not a parity clone.
MD
  cat > "$dir/.github/copilot-instructions.md" <<'MD'
# Root Copilot Instructions

Use the root workspace. Keep the project CLI-first and avoid parity claims.
MD
  for name in docs copilot-surfaces scripts; do
    cat > "$dir/.github/instructions/$name.instructions.md" <<MD
---
applyTo: "**/*"
---

# $name instructions

Root workspace guidance.
MD
  done
  cat > "$dir/.github/agents/research.agent.md" <<'MD'
---
name: research
description: Source-ground root workspace claims.
---

# Research

Use root workspace context.
MD
  cat > "$dir/.github/agents/reviewer.agent.md" <<'MD'
---
name: reviewer
description: Review root workspace changes.
handoffs:
  - label: Verify
    agent: verifier
---

# Reviewer

Review root workspace changes.
MD
  cat > "$dir/.github/agents/verifier.agent.md" <<'MD'
---
name: verifier
description: Verify root workspace changes.
---

# Verifier

Verify root workspace changes.
MD
  cat > "$dir/.github/prompts/ship-docs.prompt.md" <<'MD'
---
name: ship-docs
description: Ship root docs changes.
agent: reviewer
---

Review and ship docs.
MD
  cat > "$dir/.github/prompts/review-scope.prompt.md" <<'MD'
---
name: review-scope
description: Review scope.
agent: reviewer
---

Review scope.
MD
  cat > "$dir/.github/prompts/root-registration-check.prompt.md" <<'MD'
---
name: root-registration-check
description: Verify root registration.
agent: verifier
---

Verify root registration.
MD
  cat > "$dir/.github/skills/docs-ship/SKILL.md" <<'MD'
---
name: docs-ship
description: Run root docs checks.
---

# Docs Ship

Run `scripts/validate-doc-links.sh` and `scripts/validate-root-copilot-surfaces.sh` from the root.
MD
  cat > "$dir/.github/skills/parity-guard/SKILL.md" <<'MD'
---
name: parity-guard
description: Guard root docs against parity and over-scope drift.
---

# Parity Guard

Check parity, scope, OMC, and OMX wording before shipping.
MD
  cat > "$dir/.github/hooks/hooks.json" <<'JSON'
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "type": "command",
        "bash": "bash ./.copilot-hooks/session-start.sh",
        "cwd": ".",
        "timeoutSec": 15
      }
    ],
    "postToolUse": [
      {
        "type": "command",
        "bash": "bash ./.copilot-hooks/post-tool-audit.sh",
        "cwd": ".",
        "timeoutSec": 20
      }
    ]
  }
}
JSON
  cat > "$dir/.copilot-hooks/session-start.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p .copilot-hooks
printf 'source=root-workspace event=sessionStart\n' >> .copilot-hooks/session.log
SH
  cat > "$dir/.copilot-hooks/post-tool-audit.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p .copilot-hooks
printf 'source=root-workspace event=postToolUse\n' >> .copilot-hooks/tools.log
SH
  chmod +x "$dir/.copilot-hooks/session-start.sh" "$dir/.copilot-hooks/post-tool-audit.sh"
  mkdir -p "$dir/.github/workflows"
  cat > "$dir/.github/workflows/docs-check.yml" <<'YAML'
name: Docs Check
jobs:
  validate:
    steps:
      - run: bash scripts/validate-root-copilot-surfaces.sh
YAML
}

if [[ "$SELF_TEST" == "1" ]]; then
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  create_self_test_fixture "$tmp"
  ROOT="$tmp"
  validate_repo
  log "self-test fixture passed"
else
  validate_repo
fi
