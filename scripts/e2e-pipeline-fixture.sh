#!/usr/bin/env bash
# e2e-pipeline-fixture.sh — helper functions for Wave 7 E2E provenance smoke.
# Source this file; do not execute directly.
#
# Exported functions:
#   e2e_pipeline_setup          — copy vague-prompt.txt into a scratch dir
#   e2e_pipeline_assert_chain   — assert provenance frontmatter + temporal order
#   e2e_pipeline_synthetic_chain — create synthetic fixture files that satisfy all assertions
set -euo pipefail

# Resolve fixture directory relative to this script's location
_E2E_FIXTURE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/fixtures" && pwd)"

# ---------------------------------------------------------------------------
# e2e_pipeline_setup <scratch_dir>
# Copies the canonical vague-prompt.txt into scratch_dir and prints the path.
# ---------------------------------------------------------------------------
e2e_pipeline_setup() {
  local scratch_dir="$1"
  local src="$_E2E_FIXTURE_DIR/vague-prompt.txt"
  if [[ ! -f "$src" ]]; then
    printf 'ERROR: fixture not found: %s\n' "$src" >&2
    return 1
  fi
  cp "$src" "$scratch_dir/vague-prompt.txt"
  printf '%s/vague-prompt.txt\n' "$scratch_dir"
}

# ---------------------------------------------------------------------------
# e2e_pipeline_assert_chain <spec_file> <plan_file> <artifact>
# Verbatim assertion logic from plan rows 165-184.
# Exits non-zero and prints the failed assertion on first failure.
# ---------------------------------------------------------------------------
e2e_pipeline_assert_chain() {
  local spec_file="$1"
  local plan_file="$2"
  local artifact="$3"

  grep -q '^produced-by: deep-interview$' "$spec_file" \
    || { echo "FAIL: spec missing produced-by"; return 1; }
  grep -q '^pipeline-stage: spec$' "$spec_file" \
    || { echo "FAIL: spec stage mislabeled"; return 1; }
  grep -q '^produced-by: ralplan$' "$plan_file" \
    || { echo "FAIL: plan missing produced-by"; return 1; }
  grep -q '^pipeline-stage: plan$' "$plan_file" \
    || { echo "FAIL: plan stage mislabeled"; return 1; }
  [ -n "$artifact" ] \
    || { echo "FAIL: no artifact produced"; return 1; }

  # Temporal ordering: spec < plan < artifact
  local spec_t plan_t art_t
  spec_t=$(grep '^produced-at:' "$spec_file" | head -1 | cut -d' ' -f2)
  plan_t=$(grep '^produced-at:' "$plan_file" | head -1 | cut -d' ' -f2)
  art_t=$(stat -c %y "$artifact" | cut -d. -f1 | tr ' ' 'T')

  # CONTRACT: timestamps must be ISO-8601 UTC without timezone offset (e.g. 2026-05-06T07:30:00Z).
  # Lexicographic [[ < ]] comparison is correct ONLY for that fixed-width format.
  # A timestamp with a non-Z timezone offset (e.g. +05:30) would silently sort wrong.
  # If you change the timestamp format, switch to: epoch=$(date -d "$spec_t" +%s); ...
  [[ "$spec_t" < "$plan_t" ]] \
    || { echo "FAIL: plan not after spec (spec_t=$spec_t plan_t=$plan_t)"; return 1; }
  [[ "$plan_t" < "$art_t" ]] \
    || { echo "FAIL: artifact not after plan (plan_t=$plan_t art_t=$art_t)"; return 1; }

  echo "OK: chained provenance verified"
}

# ---------------------------------------------------------------------------
# e2e_pipeline_synthetic_chain <scratch_dir>
# Creates synthetic spec.md, plan.md, and artifact.ts in scratch_dir with
# frontmatter that satisfies every assertion in e2e_pipeline_assert_chain.
# Used in CI environments where Copilot CLI is not installed.
# ---------------------------------------------------------------------------
e2e_pipeline_synthetic_chain() {
  local scratch_dir="$1"

  # Timestamps: spec is oldest, plan is 1 second later, artifact mtime is newest
  local spec_ts="2026-05-06T00:00:01"
  local plan_ts="2026-05-06T00:00:02"
  # artifact mtime will be set after creation (must be > plan_ts)

  # Synthetic spec (produced by deep-interview)
  cat > "$scratch_dir/spec.md" <<EOF
produced-by: deep-interview
produced-at: ${spec_ts}
pipeline-stage: spec

# Spec: markdown-watcher CLI

Watch a markdown file and re-render it to HTML on save.
EOF

  # Synthetic plan (produced by ralplan)
  cat > "$scratch_dir/plan.md" <<EOF
produced-by: ralplan
produced-at: ${plan_ts}
pipeline-stage: plan

# Plan: markdown-watcher implementation

1. Parse --input / --output flags
2. Set up fs.watch with 300 ms debounce
3. Render markdown → HTML on each save event
EOF

  # Synthetic artifact (produced by autopilot)
  cat > "$scratch_dir/artifact.ts" <<EOF
// produced-by: autopilot
// pipeline-stage: artifact
import * as fs from "fs";
import { marked } from "marked";
// ... implementation placeholder
EOF

  # Push artifact mtime to a point after plan_ts so temporal ordering holds
  touch -d "2026-05-06 00:00:03" "$scratch_dir/artifact.ts"

  printf 'synthetic chain written to %s\n' "$scratch_dir"
}
