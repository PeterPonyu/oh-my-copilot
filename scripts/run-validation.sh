#!/usr/bin/env bash
# run-validation.sh — comprehensive omcp validation script.
#
# Exercises every store, every hook, and the audit script via real I/O against
# the installed plugin (or local source if installed plugin is unavailable),
# then writes a timestamped Markdown report to .omcp/validation/.
#
# Designed for human auditing and showcasing — every check shows the literal
# command run, the literal output, and a PASS/FAIL verdict with rationale.
#
# Usage: bash scripts/run-validation.sh [--out <path>]
#   Default output: .omcp/validation/validation-<timestamp>.md
#   On success exits 0; on any failed check exits 1.

set -uo pipefail

# Resolve repo + plugin paths.
# Note the parentheses: without them `||` then `&& pwd` reads as
# `(git || cd) && pwd`, which appends an extra pwd line on success.
if REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  :
else
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi
cd "$REPO_ROOT"

PLUGIN_DIR_INSTALLED="$HOME/.copilot/installed-plugins/_direct/PeterPonyu--oh-my-copilot--packages-copilot-cli-plugin"
PLUGIN_DIR_SOURCE="$REPO_ROOT/packages/copilot-cli-plugin"
if [[ -d "$PLUGIN_DIR_INSTALLED" ]]; then
  PLUGIN_DIR="$PLUGIN_DIR_INSTALLED"
  PLUGIN_LOCATION="installed-symlink"
else
  PLUGIN_DIR="$PLUGIN_DIR_SOURCE"
  PLUGIN_LOCATION="source-tree"
fi
SERVER_MJS="$PLUGIN_DIR/mcp-server/server.mjs"

# Output path. Default is local runtime state so ad-hoc validation runs do
# not leave untracked docs/validation reports behind. Pass --out docs/validation/...
# when intentionally refreshing committed showcase/audit evidence.
OUT_DEFAULT="$REPO_ROOT/.omcp/validation/validation-$(date -u +%Y-%m-%dT%H%M%SZ).md"
OUT="$OUT_DEFAULT"
REDACT="auto" # auto = redact when OUT is under docs/, raw when under .omcp/

while (($#)); do
  case "$1" in
    --out) OUT="$2"; shift 2 ;;
    --redact) REDACT="on"; shift ;;
    --no-redact) REDACT="off"; shift ;;
    --print-agentic-runbook)
      cat <<'RUNBOOK'
# Agentic Validation Runbook (manual)

This script (`run-validation.sh`) tests the MCP server via direct stdio,
which proves the SERVER works but does NOT prove a real Copilot-CLI-driven
agentic flow works (LLM dispatch, slash command resolution, hook firing
through the actual host).

For a real interactive validation, run these manually outside this repo:

## A. Verify plugin is registered
    copilot plugin list
    # Expect: omcp v0.0.7

## B. Run a slash-command-driven flow
    copilot --autopilot \
      -p "Use /omcp:doctor to inspect this plugin's install state, then summarize what you found and what each diagnostic check actually verified."
    # The agentic LLM should:
    #   - Discover the doctor skill from /omcp: namespace
    #   - Read the SKILL.md prompt
    #   - Invoke MCP tools (state_list_active, etc.) per the skill's instructions
    #   - Synthesize a report

## C. Verify hooks fire under real session
    copilot -p "List 3 files in this directory using shell." \
      --allow-tool='shell(ls:*)'
    # After exit, check:
    grep '"event":"postToolUse"' .copilot-hooks/events.jsonl | tail -3
    grep -c "validation-e2e" .omcp/traces/default.jsonl || true

## D. Verify a state-persisting skill
    copilot --autopilot \
      -p "Use /omcp:cancel --dry-run to inspect any active orchestration state, but DO NOT clear anything."
    # The skill should call mcp__omcp__state_list_active and report
    # findings without mutating state files.

## Why this is manual, not scripted
Nested copilot CLI invocations with --allow-all-tools require explicit
human consent in most harnesses (auth, recursion, blast-radius). Run
the four steps above interactively after `bash scripts/run-validation.sh`
passes. Your report will then have BOTH the direct-stdio evidence (this
script) AND the real-agentic evidence (the manual session output).

Save manual session output to docs/validation/agentic-<date>.md if you
want it committed alongside the auto-generated report.
RUNBOOK
      exit 0
      ;;
    -h|--help)
      cat <<'USAGE'
Usage: bash scripts/run-validation.sh [options]

Exercises every omcp store + hook + audit script via real I/O and writes a
human-auditable Markdown report.

Options:
  --out <path>                Output path (default: .omcp/validation/...)
  --redact / --no-redact      Force redaction on/off. Default 'auto':
                              redact when OUT is under docs/, raw under .omcp/
  --print-agentic-runbook     Print the manual-step runbook for real
                              Copilot-CLI agentic validation (out of scope
                              for this auto-script) and exit.
  -h, --help                  Show this help

Redaction replaces $HOME, hostname, and tmp working dir with placeholders
in the report content (script execution still uses real paths).
USAGE
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Decide redaction based on output path if auto
if [[ "$REDACT" == "auto" ]]; then
  case "$OUT" in
    *"/docs/"*|*"/docs/"|"docs/"*) REDACT="on" ;;
    *) REDACT="off" ;;
  esac
fi

mkdir -p "$(dirname "$OUT")"
WORKDIR="$(mktemp -d -t omcp-validation-XXXXXX)"
trap 'rm -rf "$WORKDIR"' EXIT
PASS_COUNT=0
FAIL_COUNT=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
report_init() {
  cat >"$OUT" <<HEAD
# omcp Validation Report

**Generated:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Plugin location:** \`$PLUGIN_DIR\` ($PLUGIN_LOCATION)
**Plugin version:** $(grep '"version"' "$PLUGIN_DIR/plugin.json" | sed -E 's/.*"version":\s*"([^"]+)".*/\1/')
**Validation run host:** \`$(hostname 2>/dev/null || echo unknown)\` ($(uname -s 2>/dev/null) $(uname -m 2>/dev/null))
**Working dir for tool side-effects:** \`$WORKDIR\`

This report exercises every omcp component end-to-end: each check shows the
literal command, the literal stdout (or content snippet), and a PASS/FAIL
verdict with rationale. The same script is committed at
\`scripts/run-validation.sh\` and is reproducible on any clean checkout.

## Checks

HEAD
}

# Run a check that calls the MCP server and asserts a property of the JSON
# response. Args: $1 label, $2 description, $3 jsonrpc-payload, $4 jq-expr,
# $5 expected (use 'EXISTS' to just assert non-empty).
mcp_check() {
  local label="$1" desc="$2" payload="$3" jq_expr="$4" expected="$5"
  local response actual verdict reason
  response="$(cd "$WORKDIR" && echo "$payload" | node "$SERVER_MJS" 2>&1 | head -1)"
  actual="$(echo "$response" | node -e '
    let d = ""; process.stdin.on("data", c => d += c);
    process.stdin.on("end", () => {
      try {
        const j = JSON.parse(d.trim());
        const inner = j.result && j.result.content && j.result.content[0] && j.result.content[0].text;
        const parsed = inner ? JSON.parse(inner) : j;
        const path = process.argv[1].split(".");
        let v = parsed;
        for (const p of path) { if (v == null) break; v = v[p]; }
        process.stdout.write(JSON.stringify(v));
      } catch (e) { process.stdout.write("(parse-error: " + e.message + ")"); }
    });
  ' "$jq_expr")"

  if [[ "$expected" == "EXISTS" ]]; then
    if [[ -n "$actual" && "$actual" != "null" && "$actual" != '""' ]]; then
      verdict="PASS"; reason="result $jq_expr is present"
    else
      verdict="FAIL"; reason="result $jq_expr is missing or empty"
    fi
  else
    if [[ "$actual" == "$expected" ]]; then
      verdict="PASS"; reason="result $jq_expr equals expected"
    else
      verdict="FAIL"; reason="expected $expected, got $actual"
    fi
  fi
  emit "$label" "$desc" "$payload" "$response" "$verdict" "$reason"
}

# Run an arbitrary command, capture its output, and call PASS if exit code is
# 0 and a regex matches stdout (or just exit 0 if regex empty).
shell_check() {
  local label="$1" desc="$2" cmd="$3" regex="${4:-}"
  local out exit_code verdict reason
  out="$(eval "$cmd" 2>&1)" || true
  exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    verdict="FAIL"; reason="command exited $exit_code"
  elif [[ -n "$regex" && ! "$out" =~ $regex ]]; then
    verdict="FAIL"; reason="output did not match /$regex/"
  else
    verdict="PASS"; reason="exited 0$( [[ -n "$regex" ]] && echo ", output matched /$regex/" )"
  fi
  emit "$label" "$desc" "$cmd" "$out" "$verdict" "$reason"
}

emit() {
  local label="$1" desc="$2" cmd="$3" out="$4" verdict="$5" reason="$6"
  if [[ "$verdict" == "PASS" ]]; then PASS_COUNT=$((PASS_COUNT+1)); else FAIL_COUNT=$((FAIL_COUNT+1)); fi
  {
    echo "### $label — $verdict"
    echo
    echo "$desc"
    echo
    echo '**Command:**'
    echo
    echo '```'
    echo "$cmd" | head -c 2000
    echo
    echo '```'
    echo
    echo '**Output:**'
    echo
    echo '```'
    echo "$out" | head -c 2000
    echo
    echo '```'
    echo
    echo "**Verdict:** $verdict — $reason"
    echo
    echo "---"
    echo
  } >>"$OUT"
}

# ---------------------------------------------------------------------------
# Run checks
# ---------------------------------------------------------------------------
report_init

# 1. Plugin metadata
shell_check "plugin-version" \
  "Wave-F: plugin.json version is the current declared version (0.0.7)." \
  "grep '\"version\"' $PLUGIN_DIR/plugin.json | sed -E 's/.*\"version\": *\"([^\"]+)\".*/\\1/'" \
  "0.0.7"

# 2. Tool count
# Keep a structural floor instead of an exact count so valid new tools do not
# false-fail the validation harness. This mirrors server.integration.test.mjs.
shell_check "tools-list-count" \
  "Wave B-1..B-6 + rules policy: MCP server registers at least 41 tools." \
  "echo '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}' | node $SERVER_MJS 2>&1 | head -1 | node -e 'let d=\"\"; process.stdin.on(\"data\",c=>d+=c); process.stdin.on(\"end\",()=>{const j=JSON.parse(d.trim()); const count=j.result.tools.length; if (count < 41) { console.error(\"expected at least 41 tools, got \" + count); process.exit(1); } console.log(\"ok:\" + count);})'" \
  "^ok:[0-9]+$"

# 3-9. Per-store round-trips
mcp_check "state-write-key-form" \
  "Wave B-1: state_write({key, value}) form writes to .omcp/state/<key>.json." \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"state_write","arguments":{"key":"validation-key","value":{"check":"state-key-form"}}}}' \
  "ok" \
  "true"

mcp_check "state-read-roundtrip" \
  "Wave B-1: state_read returns the value just written." \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"state_read","arguments":{"key":"validation-key"}}}' \
  "value.check" \
  '"state-key-form"'

mcp_check "state-mode-form" \
  "Wave D-1: state_write({mode, ...rest}) writes to <mode>-state.json with mode field stripped." \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"state_write","arguments":{"mode":"validation","active":true,"current_phase":"audit"}}}' \
  "path" \
  EXISTS

mcp_check "state-mode-read" \
  "Wave D-1: state_read({mode}) returns the value for <mode>-state.json." \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"state_read","arguments":{"mode":"validation"}}}' \
  "value.active" \
  "true"

mcp_check "project-memory-write" \
  "Wave B-2: project_memory_write merges facts and persists them." \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"project_memory_write","arguments":{"facts":{"validated":"yes","wave":"F"}}}}' \
  "facts.validated" \
  '"yes"'

mcp_check "notepad-write-priority" \
  "Wave B-3: notepad_write_priority appends a priority-lane entry." \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"notepad_write_priority","arguments":{"entry":"validation entry"}}}' \
  "ok" \
  "true"

mcp_check "trace-write" \
  "Wave B-4: trace_write returns ok with kind echoed." \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"trace_write","arguments":{"kind":"note","text":"validation trace"}}}' \
  "kind" \
  '"note"'

mcp_check "wiki-add-then-read" \
  "Wave B-5: wiki_add slug is auto-derived from title." \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"wiki_add","arguments":{"title":"Validation Page","body":"validation body","tags":["audit"]}}}' \
  "slug" \
  '"validation-page"'

mcp_check "shared-memory-write" \
  "Wave B-6: shared_memory_write returns the channel name." \
  '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"shared_memory_write","arguments":{"channel":"validation-channel","kind":"note","payload":{"v":1}}}}' \
  "channel" \
  '"validation-channel"'

# 10. Audit script
shell_check "audit-tool-refs" \
  "Wave C-2: tool-ref audit script reports zero blocking entries (list a empty)." \
  "node $REPO_ROOT/scripts/audit-tool-refs.mjs" \
  "OK: every referenced tool"

# 10b. Skill receipt + ai-slop integration validator (COPILOT-3 / COPILOT-4)
shell_check "skill-receipts" \
  "COPILOT-3/4: pipeline-stage skills declare the provenance/receipt contract and the ai-slop-cleaner quality step is wired into autopilot, ultrawork, and ralph." \
  "node $REPO_ROOT/scripts/validate-skill-receipts.mjs" \
  "provenance/receipt contract and ai-slop-cleaner quality step validate"

# 11. Hook bridge helper exists
shell_check "omcp-call-store-defined" \
  "Wave C-3: omcp_call_store helper is defined in .copilot-hooks/common.sh." \
  "grep -c '^omcp_call_store()' $REPO_ROOT/.copilot-hooks/common.sh" \
  "^1$"

# 12. Hook scripts use git rev-parse (Wave-E fix)
shell_check "hook-path-fix" \
  "Wave E: post-tool-audit and log-session-start use git rev-parse for REPO_ROOT." \
  "grep -l 'git rev-parse --show-toplevel' $PLUGIN_DIR/scripts/post-tool-audit.sh $PLUGIN_DIR/scripts/log-session-start.sh | wc -l" \
  "^2$"

# 13. End-to-end hook + bridge
shell_check "hook-e2e-trace" \
  "Wave C-3 + Wave E: post-tool-audit hook captures a tool_failure envelope, writes a trace event via the bridge through the install path. The marker (timestamp-suffixed) must appear in .omcp/traces/default.jsonl after the hook runs." \
  "MARKER=\"validation-e2e-\$(date +%s%N)\" && echo \"{\\\"tool\\\":\\\"\$MARKER\\\",\\\"exit_code\\\":42,\\\"stderr\\\":\\\"e2e validation\\\"}\" | bash $PLUGIN_DIR/scripts/post-tool-audit.sh > /dev/null && grep -c \"\$MARKER\" $REPO_ROOT/.omcp/traces/default.jsonl" \
  "^[1-9][0-9]*\$"

# 14. Plugin source-of-truth mirror
shell_check "plugin-source-truth-mirror" \
  "Plugin-canonical instructions, agents, skills, and commands regenerate the root mirror without drift." \
  "test -f $PLUGIN_DIR/instructions/AGENTS.md && bash $REPO_ROOT/scripts/check-mirror-drift.sh" \
  "OK — no drift detected"

# 15. node:test full suite
shell_check "mcp-server-tests" \
  "All store + integration + fixture unit tests pass." \
  "cd $PLUGIN_DIR/mcp-server && node --test --test-reporter=tap 'tests/*.test.mjs' 2>&1 | grep -E '^# (tests|pass|fail) ' | tr '\\n' ' '" \
  "fail 0"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL=$((PASS_COUNT + FAIL_COUNT))
{
  echo "## Summary"
  echo
  echo "| Metric | Value |"
  echo "|---|---|"
  echo "| Total checks | $TOTAL |"
  echo "| Passed | $PASS_COUNT |"
  echo "| Failed | $FAIL_COUNT |"
  echo "| Plugin location | \`$PLUGIN_DIR\` ($PLUGIN_LOCATION) |"
  echo "| Working dir | \`$WORKDIR\` (cleaned up after run) |"
  echo
  if [[ $FAIL_COUNT -eq 0 ]]; then
    echo "**All checks passed.**"
  else
    echo "**Failed checks:** $FAIL_COUNT"
  fi
  echo
  echo "_Generated by \`scripts/run-validation.sh\` at $(date -u +"%Y-%m-%dT%H:%M:%SZ")._"
} >>"$OUT"

# Redact home/host/tmp paths from the report content if requested.
# The script execution still uses real paths; only the committed/displayed
# report is sanitized. This keeps the report shareable in public repos
# without leaking machine-specific user paths.
if [[ "$REDACT" == "on" ]]; then
  HOST_NAME="$(hostname 2>/dev/null || echo unknown)"
  # Use | as sed delimiter to avoid escaping / in paths
  sed -i \
    -e "s|$WORKDIR|<tmpdir>|g" \
    -e "s|$HOME/|\$HOME/|g" \
    -e "s|$HOST_NAME|<host>|g" \
    "$OUT"
fi

echo "Report written to: $OUT"
echo "Redaction: $REDACT"
echo "Result: $PASS_COUNT/$TOTAL passed."
[[ $FAIL_COUNT -eq 0 ]] && exit 0 || exit 1
