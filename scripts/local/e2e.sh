#!/usr/bin/env bash
# scripts/local/e2e.sh — tiered E2E harness for oh-my-copilot (OMCP)
# Tiers:
#   structural  — credential-free structural fixture (validate-structural-e2e.sh)
#   headless    — credential-free CLI presence/metadata checks (smoke default mode)
#   real        — model-backed deep-interview → ralplan → autopilot pipeline
#
# Usage:
#   OMCP_E2E_STRUCTURAL=1  bash scripts/local/e2e.sh   # structural tier only
#   OMCP_E2E_HEADLESS=1    bash scripts/local/e2e.sh   # headless tier
#   OMCP_E2E_HEADLESS=1 OMCP_E2E_REAL=1 bash scripts/local/e2e.sh  # real tier
set -euo pipefail

# Env-var aliases (OMX_ prefix accepted for cross-repo compat)
: "${OMCP_E2E_STRUCTURAL:=${OMX_E2E_STRUCTURAL:-0}}"
: "${OMCP_E2E_HEADLESS:=${OMX_E2E_HEADLESS:-0}}"
: "${OMCP_E2E_REAL:=${OMX_E2E_REAL:-0}}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVIDENCE_DIR="${OMCP_EVIDENCE_DIR:-$ROOT/.omcp/evidence}"
mkdir -p "$EVIDENCE_DIR"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="$EVIDENCE_DIR/e2e-${TIMESTAMP}.log"

log()  { printf '%s\n' "$*" | tee -a "$LOG"; }
fail() { printf '[OMCP] e2e failed: %s\n' "$*" | tee -a "$LOG" >&2; exit 1; }

# write_result <tier> [journey] [model_backed]
write_result() {
  local tier="$1"
  local journey="${2:-}"
  local model_backed="${3:-false}"
  local rf="$EVIDENCE_DIR/e2e-result.json"
  python3 - "$rf" "$tier" "$journey" "$model_backed" "$TIMESTAMP" <<'PY'
import json, pathlib, sys
rf, tier, journey, model_backed, ts = sys.argv[1:]
result = {
  "host": "copilot",
  "brand": "OMCP",
  "tier": tier,
  "passed": True,
  "journey": journey,
  "modelBacked": model_backed == "true",
  "timestamp": ts,
  "marker": f"[OMCP] e2e passed (tier={tier})"
}
pathlib.Path(rf).write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(f"ok: evidence written to {rf}")
PY
}

log "=== OMCP E2E harness start (structural=${OMCP_E2E_STRUCTURAL} headless=${OMCP_E2E_HEADLESS} real=${OMCP_E2E_REAL}) ==="

# ---------------------------------------------------------------------------
# Structural tier — always runs (prerequisite for higher tiers)
# ---------------------------------------------------------------------------
log "--- tier: structural ---"
bash "$ROOT/scripts/validate-structural-e2e.sh" 2>&1 | tee -a "$LOG" \
  || fail "structural validation failed"

if [[ "$OMCP_E2E_STRUCTURAL" == "1" ]]; then
  write_result "structural" "" "false"
  log "[OMCP] structural e2e passed (tier=structural)"
  exit 0
fi

# ---------------------------------------------------------------------------
# Headless tier — credential-free CLI presence/metadata checks (no model)
# ---------------------------------------------------------------------------
log "--- tier: headless ---"
bash "$ROOT/scripts/smoke-copilot-cli.sh" 2>&1 | tee -a "$LOG" \
  || fail "headless smoke (copilot CLI presence/metadata) failed"

if [[ "$OMCP_E2E_HEADLESS" == "1" && "$OMCP_E2E_REAL" != "1" ]]; then
  write_result "headless" "" "false"
  log "[OMCP] e2e passed (tier=headless)"
  exit 0
fi

# ---------------------------------------------------------------------------
# Real tier — model-backed pipeline (deep-interview → ralplan → autopilot)
# DO NOT run locally without a valid COPILOT_GITHUB_TOKEN and model quota.
# ---------------------------------------------------------------------------
log "--- tier: real ---"
RUN_COPILOT_AGENT_SMOKE=1 COPILOT_SMOKE_MODEL="${COPILOT_SMOKE_MODEL:-gpt-5-mini}" \
  bash "$ROOT/scripts/smoke-copilot-cli.sh" --run-agent-prompts 2>&1 | tee -a "$LOG" \
  || fail "copilot real pipeline (deep-interview->ralplan->autopilot) failed"

write_result "real" "deep-interview->ralplan->autopilot" "true"
log "[OMCP] e2e passed (tier=real)"
