#!/usr/bin/env bash
set -euo pipefail

# Validate the docs-first oh-my-copilot public research repository.
# This is intentionally a repository hygiene/test script, not product runtime.

ROOT="."
CHECK_EXTERNAL="${CHECK_EXTERNAL:-0}"
SELF_TEST=0
PRINT_EVIDENCE_TEMPLATE=0

usage() {
  cat <<'USAGE'
Usage: scripts/validate-doc-links.sh [--root PATH] [--check-external] [--self-test] [--print-evidence-template]

Checks the approved docs/research/examples scope for:
  - required public research files
  - Copilot CLI-first and docs-first v1 boundaries
  - Copilot-native, non-parity language
  - citation/reference coverage
  - internal Markdown links
  - JSON validity for illustrative hook policy

Use --print-evidence-template to print the final verification evidence checklist.
External link checks are opt-in with --check-external or CHECK_EXTERNAL=1.
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
    --check-external)
      CHECK_EXTERNAL=1
      shift
      ;;
    --self-test)
      SELF_TEST=1
      shift
      ;;
    --print-evidence-template)
      PRINT_EVIDENCE_TEMPLATE=1
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

required_files=(
  README.md
  LICENSE
  docs/design-spec.md
  docs/comparison-matrix.md
  docs/v1-repo-blueprint.md
  docs/copilot-native-mapping.md
  docs/references.md
  docs/release-checklist.md
  research/omc-analysis.md
  research/omx-analysis.md
  research/copilot-cli-capabilities.md
  examples/copilot-cli-layout/AGENTS.md
  examples/copilot-cli-layout/.github/copilot-instructions.md
  examples/copilot-cli-layout/.github/instructions/typescript.instructions.md
  examples/copilot-cli-layout/.github/agents/research.agent.md
  examples/copilot-cli-layout/.github/agents/reviewer.agent.md
  examples/copilot-cli-layout/.github/skills/ecosystem-compare/SKILL.md
  examples/copilot-cli-layout/.github/skills/blueprint-check/SKILL.md
  examples/copilot-cli-layout/.github/hooks/policy.json
)

contains() {
  local pattern="$1"
  shift
  (cd "$ROOT" && grep -Eiq -- "$pattern" "$@")
}

require_file() {
  local path="$1"
  [[ -f "$ROOT/$path" ]] || fail "missing required file: $path"
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
  for path in "${required_files[@]}"; do
    require_file "$path"
  done
  log "all required files exist"
}

validate_scope_language() {
  require_contains "README states v1 is Copilot CLI-first" 'Copilot CLI-first|CLI-first' README.md
  require_contains "design spec states v1 is Copilot CLI-first" 'Copilot CLI-first|CLI-first' docs/design-spec.md
  require_contains "public docs bound multi-surface expansion as out of scope for v1" 'multi-surface.*out of scope|out of scope.*multi-surface|cloud agent.*IDE.*SDK|cloud.*IDE.*SDK' README.md docs/design-spec.md docs/copilot-native-mapping.md
  require_contains "mapping recommends Copilot-native adaptation" 'Copilot-native.*adapt|adapt.*Copilot-native|Copilot CLI-native primitive|v1 translation pattern|CLI-native primitive' docs/copilot-native-mapping.md
  require_contains "mapping rejects or bounds forced parity" 'forced parity|one-to-one parity|1:1 parity|1:1 feature parity|avoid.*parity|parity.*avoid|not.*parity|parity.*not|parity.*reject|reject.*parity' docs/copilot-native-mapping.md
  require_contains "docs explain why Copilot CLI is the closest local analogue" 'closest.*analogue|closest.*analog|local.*Claude Code.*Codex|Claude Code.*Codex.*local' README.md docs/design-spec.md docs/copilot-native-mapping.md
}

validate_comparison_matrix() {
  require_contains "comparison matrix names oh-my-claudecode" 'oh-my-claudecode' docs/comparison-matrix.md
  require_contains "comparison matrix names oh-my-codex" 'oh-my-codex' docs/comparison-matrix.md
  require_contains "comparison matrix names oh-my-copilot v1" 'oh-my-copilot v1' docs/comparison-matrix.md

  local dimension
  for dimension in 'host' 'guidance files|instructions|guidance file' 'skills' 'agents' 'hooks' 'MCP|integrations' 'delegation' 'state philosophy|state' 'v1 design rule|design rule' ; do
    require_contains "comparison matrix covers ${dimension}" "$dimension" docs/comparison-matrix.md
  done
}

validate_blueprint_and_examples() {
  local path pattern basename
  for path in "${required_files[@]}"; do
    case "$path" in
      docs/*|README.md|LICENSE) ;;
      *)
        basename="${path##*/}"
        pattern="$(printf '%s' "$path" | sed 's/[.[\*^$()+?{}|]/\\&/g')|$(printf '%s' "$basename" | sed 's/[.[\*^$()+?{}|]/\\&/g')"
        require_contains "blueprint lists $path" "$pattern" docs/v1-repo-blueprint.md
        ;;
    esac
  done
  require_contains "blueprint labels examples as illustrative" 'illustrative' docs/v1-repo-blueprint.md
  local example_md
  while IFS= read -r example_md; do
    require_contains "$example_md is labeled illustrative" 'illustrative' "$example_md"
  done < <(cd "$ROOT" && find examples/copilot-cli-layout -name '*.md' -type f | sort)
}

validate_references() {
  require_contains "references include GitHub docs or changelog URLs" 'https://(docs\.github\.com|github\.blog)' docs/references.md
  require_contains "references include an access/current-as-of date" 'Access date|Accessed|accessed|Current as of|current as of|2026-04-20|April 20, 2026' docs/references.md

  local topic
  for topic in 'custom instructions' 'AGENTS\.md' 'skills' 'custom agents' 'hooks' 'plugins|MCP' 'Copilot CLI|agentic|autopilot|delegation' 'Cursor'; do
    require_contains "references cover ${topic}" "$topic" docs/references.md
  done
}

validate_evidence_inference() {
  local doc
  for doc in research/omc-analysis.md research/omx-analysis.md research/copilot-cli-capabilities.md; do
    require_contains "$doc has an Evidence section" 'Evidence|Source-backed' "$doc"
    require_contains "$doc has an Inference/Assumption section" 'Inference|Assumption|Design inference' "$doc"
  done
  require_contains "mapping distinguishes source-backed claims from inference" 'Evidence|Source-backed|Inference|Design inference' docs/copilot-native-mapping.md research/copilot-cli-capabilities.md
}

validate_scope_creep_terms() {
  local tmp
  tmp="$(mktemp)"
  # Automated scope checking only fails on likely positive over-claims. The
  # evidence template still asks humans to review every sensitive term because
  # terms such as runtime/parity are valid in non-goals and lineage analysis.
  if (cd "$ROOT" && grep -RInE --include='*.md' 'v1.*(cloud agent|IDE|SDK).*in scope|full feature parity|runtime framework implemented|production runtime implementation|supported runtime implementation|is a runtime product|implements.*tmux worker runtime' README.md docs research examples > "$tmp" || true); then
    if [[ -s "$tmp" ]]; then
      cat "$tmp" >&2
      rm -f "$tmp"
      fail "potential positive over-scope language found"
    fi
  fi
  rm -f "$tmp"
  log "scope creep terms are bounded"
}

validate_json() {
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$ROOT/examples/copilot-cli-layout/.github/hooks/policy.json" <<'PY'
import json
import pathlib
import sys
path = pathlib.Path(sys.argv[1])
json.loads(path.read_text(encoding="utf-8"))
PY
    log "illustrative hook policy JSON is valid"
  else
    log "python3 unavailable; skipped hook JSON parse"
  fi
}

validate_internal_links() {
  if ! command -v python3 >/dev/null 2>&1; then
    log "python3 unavailable; skipped internal Markdown link validation"
    return
  fi
  python3 - "$ROOT" <<'PY'
from __future__ import annotations
import pathlib
import re
import sys
from urllib.parse import unquote

root = pathlib.Path(sys.argv[1]).resolve()
errors: list[str] = []
link_re = re.compile(r'(?<!!)\[[^\]]+\]\(([^)]+)\)')
heading_re = re.compile(r'^(#{1,6})\s+(.+?)\s*$')

def slugify(text: str) -> str:
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'[`*_\[\]()]', '', text).strip().lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[\s-]+', '-', text).strip('-')

def collect_anchors(path: pathlib.Path) -> set[str]:
    anchors: set[str] = set()
    counts: dict[str, int] = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        match = heading_re.match(line)
        if not match:
            continue
        base = slugify(match.group(2))
        if not base:
            continue
        count = counts.get(base, 0)
        counts[base] = count + 1
        anchors.add(base if count == 0 else f'{base}-{count}')
    return anchors

markdown_files = [
    p for p in root.rglob('*.md')
    if '.git' not in p.relative_to(root).parts
    and '.omx' not in p.relative_to(root).parts
    and 'node_modules' not in p.relative_to(root).parts
]
anchors = {p: collect_anchors(p) for p in markdown_files}

for path in markdown_files:
    text = path.read_text(encoding='utf-8')
    for lineno, line in enumerate(text.splitlines(), 1):
        for raw in link_re.findall(line):
            target = raw.strip().split()[0]
            if not target or target.startswith(('http://', 'https://', 'mailto:')):
                continue
            if target.startswith('#'):
                dest = path
                fragment = target[1:]
            else:
                raw_path, _sep, fragment = target.partition('#')
                raw_path = raw_path.split('?', 1)[0]
                dest = path if not raw_path else (path.parent / unquote(raw_path)).resolve()
                try:
                    dest.relative_to(root)
                except ValueError:
                    errors.append(f'{path.relative_to(root)}:{lineno}: link escapes repository: {target}')
                    continue
            if not dest.exists():
                errors.append(f'{path.relative_to(root)}:{lineno}: missing target: {target}')
                continue
            if fragment and dest.suffix.lower() == '.md':
                wanted = slugify(unquote(fragment))
                if wanted and wanted not in anchors.get(dest, set()):
                    errors.append(f"{path.relative_to(root)}:{lineno}: missing heading '#{fragment}' in {dest.relative_to(root)}")

if errors:
    print('Internal markdown link check FAILED', file=sys.stderr)
    for error in errors:
        print(f'- {error}', file=sys.stderr)
    sys.exit(1)
PY
  log "internal Markdown links resolve"
}

validate_external_links() {
  [[ "$CHECK_EXTERNAL" == "1" ]] || { log "external link checks skipped (set CHECK_EXTERNAL=1 to enable)"; return; }
  command -v curl >/dev/null 2>&1 || fail "curl is required for external link checks"
  local url failures=0
  while IFS= read -r url; do
    [[ -n "$url" ]] || continue
    if ! curl --location --head --fail --silent --show-error --max-time 20 "$url" >/dev/null; then
      printf 'External link failed: %s\n' "$url" >&2
      failures=$((failures + 1))
    fi
  done < <(cd "$ROOT" && grep -RhoE 'https?://[^ )]+' README.md docs research examples | sort -u)
  [[ "$failures" -eq 0 ]] || fail "$failures external link(s) failed"
  log "external links are reachable"
}

validate_repo() {
  validate_required_files
  validate_scope_language
  validate_comparison_matrix
  validate_blueprint_and_examples
  validate_references
  validate_evidence_inference
  validate_scope_creep_terms
  validate_json
  validate_internal_links
  validate_external_links
  log "oh-my-copilot docs/research/examples validation complete"
}

create_self_test_fixture() {
  local dir="$1"
  mkdir -p \
    "$dir/docs" \
    "$dir/research" \
    "$dir/examples/copilot-cli-layout/.github/instructions" \
    "$dir/examples/copilot-cli-layout/.github/agents" \
    "$dir/examples/copilot-cli-layout/.github/skills/ecosystem-compare" \
    "$dir/examples/copilot-cli-layout/.github/skills/blueprint-check" \
    "$dir/examples/copilot-cli-layout/.github/hooks"

  cat > "$dir/README.md" <<'MD'
# oh-my-copilot

`oh-my-copilot` v1 is Copilot CLI-first and research-first. It explains why Copilot CLI is the closest local analogue to Claude Code and Codex while avoiding forced parity. Multi-surface work for cloud agent, IDE, and SDK surfaces is out of scope for v1 and recorded only as a future non-goal.

Read [the design spec](docs/design-spec.md), [the comparison matrix](docs/comparison-matrix.md), [the mapping](docs/copilot-native-mapping.md), [the blueprint](docs/v1-repo-blueprint.md), and [the references](docs/references.md).
MD
  cat > "$dir/LICENSE" <<'MD'
MIT License
MD
  cat > "$dir/docs/design-spec.md" <<'MD'
# Design Spec

V1 is Copilot CLI-first. Cloud agent, IDE, SDK, and broader multi-surface expansion are out of scope for v1. The project is docs-first and not a runtime. Copilot CLI is the closest local analogue to Claude Code and Codex because it is terminal-centered.
MD
  cat > "$dir/docs/comparison-matrix.md" <<'MD'
# Comparison Matrix

| Concern | oh-my-claudecode | oh-my-codex | oh-my-copilot v1 |
| --- | --- | --- | --- |
| Host | Claude Code | Codex CLI | GitHub Copilot CLI |
| Guidance files / instructions | CLAUDE.md | AGENTS.md | AGENTS.md and GitHub instructions |
| Skills | Skills | Skills | Skills |
| Agents | Agents | Agents | Custom agents |
| Hooks / MCP | Hooks and MCP | Hooks and MCP | Hooks and MCP |
| Delegation | Worker delegation | Team delegation | Copilot delegation |
| State philosophy | Runtime-heavy | Runtime-heavy | Native CLI state |
| V1 design rule | Reference | Reference | Copilot-native adaptation, not forced parity |
MD
  cat > "$dir/docs/copilot-native-mapping.md" <<'MD'
# Copilot-Native Mapping

Source-backed Evidence and Design inference are separated here. Prefer Copilot-native adaptation over forced parity or one-to-one parity. Custom instructions, `AGENTS.md`, path-specific instructions, custom agents, skills, hooks, MCP, plugins, plan, autopilot, delegation, and review surfaces should be adapted. Runtime parity is rejected as a bounded non-goal.
MD
  cat > "$dir/docs/references.md" <<'MD'
# References

Current as of 2026-04-20.

- GitHub Copilot CLI docs: https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-agents/overview — covers Copilot CLI, agentic flows, autopilot, and delegation.
- Custom instructions and AGENTS.md: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions — covers custom instructions and AGENTS.md.
- Skills: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills — covers skills.
- Custom agents: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli — covers custom agents.
- Hooks: https://docs.github.com/en/copilot/how-tos/copilot-cli/use-hooks — covers hooks.
- Plugins and MCP: https://docs.github.com/copilot/concepts/agents/copilot-cli/about-cli-plugins — covers plugins and MCP.
- Changelog: https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/ — covers CLI availability.
MD
  cat > "$dir/docs/release-checklist.md" <<'MD'
# Release Checklist

The release path is CLI-first, keeps the plugin canonical, keeps examples
illustrative, records version updates in plugin.json, and includes release notes
plus Copilot CLI smoke-test evidence.
MD
  cat > "$dir/docs/v1-repo-blueprint.md" <<'MD'
# V1 Repo Blueprint

The examples are illustrative and not a runtime.

- `research/omc-analysis.md` — OMC evidence and inference.
- `research/omx-analysis.md` — OMX evidence and inference.
- `research/copilot-cli-capabilities.md` — Copilot CLI evidence and inference.
- `examples/copilot-cli-layout/AGENTS.md` — illustrative guidance.
- `examples/copilot-cli-layout/.github/copilot-instructions.md` — illustrative Copilot instructions.
- `examples/copilot-cli-layout/.github/instructions/typescript.instructions.md` — path-specific illustrative instructions.
- `examples/copilot-cli-layout/.github/agents/research.agent.md` — illustrative custom agent.
- `examples/copilot-cli-layout/.github/agents/reviewer.agent.md` — illustrative custom agent.
- `examples/copilot-cli-layout/.github/skills/ecosystem-compare/SKILL.md` — illustrative skill.
- `examples/copilot-cli-layout/.github/skills/blueprint-check/SKILL.md` — illustrative skill.
- `examples/copilot-cli-layout/.github/hooks/policy.json` — illustrative hook policy.
MD
  cat > "$dir/research/omc-analysis.md" <<'MD'
# OMC Analysis

## Evidence
OMC is a reference lineage.

## Inference
Do not clone runtime parity; treat parity as a bounded non-goal.
MD
  cat > "$dir/research/omx-analysis.md" <<'MD'
# OMX Analysis

## Evidence
OMX is a reference lineage.

## Inference
Adapt concepts, not runtime machinery.
MD
  cat > "$dir/research/copilot-cli-capabilities.md" <<'MD'
# Copilot CLI Capabilities

## Evidence
Copilot CLI supports CLI primitives.

## Inference
Design inference maps OMC/OMX ideas into Copilot-native surfaces.
MD
  cat > "$dir/examples/copilot-cli-layout/AGENTS.md" <<'MD'
# Illustrative AGENTS.md

This illustrative example is not a runtime and not full parity.
MD
  cat > "$dir/examples/copilot-cli-layout/.github/copilot-instructions.md" <<'MD'
# Illustrative Copilot Instructions

This illustrative example is not a runtime.
MD
  cat > "$dir/examples/copilot-cli-layout/.github/instructions/typescript.instructions.md" <<'MD'
# TypeScript Instructions

Illustrative path-specific instructions.
MD
  cat > "$dir/examples/copilot-cli-layout/.github/agents/research.agent.md" <<'MD'
# Research Agent

Illustrative custom agent.
MD
  cat > "$dir/examples/copilot-cli-layout/.github/agents/reviewer.agent.md" <<'MD'
# Reviewer Agent

Illustrative custom agent.
MD
  cat > "$dir/examples/copilot-cli-layout/.github/skills/ecosystem-compare/SKILL.md" <<'MD'
# Ecosystem Compare Skill

Illustrative skill.
MD
  cat > "$dir/examples/copilot-cli-layout/.github/skills/blueprint-check/SKILL.md" <<'MD'
# Blueprint Check Skill

Illustrative skill.
MD
  cat > "$dir/examples/copilot-cli-layout/.github/hooks/policy.json" <<'JSON'
{"illustrative": true, "policies": []}
JSON
}


print_evidence_template() {
  cat <<'TEMPLATE'
# Final Verification Evidence Template

Report each check as PASS or FAIL with the command and the relevant output.

1. File presence and docs contract
   - `bash scripts/validate-doc-links.sh`
   - Expected PASS after README, docs, research, and illustrative examples exist.

2. Optional external citation reachability
   - `CHECK_EXTERNAL=1 bash scripts/validate-doc-links.sh`
   - Expected PASS or documented external-network/source failure.

3. Repository scope audit
   - `git status --short --branch`
   - `git ls-files`
   - Expected: files are limited to README, LICENSE, docs/, research/, examples/, scripts/, and .github/workflows/ hygiene.

4. Source and scope spot checks
   - `grep -RInE 'cloud|IDE|SDK|runtime|full feature|implemented|parity' README.md docs research examples`
   - Expected: every occurrence is bounded as a non-goal, future note, citation, or illustrative example.

5. Script/static checks
   - `bash -n scripts/validate-doc-links.sh`
   - `git diff --check`
   - Expected: no syntax errors or whitespace errors.

6. Typecheck/lint applicability
   - If no TypeScript/package tooling exists, record: "N/A — docs-only repository; no package manifest or TypeScript sources."
   - If tooling is later added, run the repo-standard typecheck/lint commands and include output.
TEMPLATE
}

if [[ "$PRINT_EVIDENCE_TEMPLATE" == "1" ]]; then
  print_evidence_template
  exit 0
fi

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
