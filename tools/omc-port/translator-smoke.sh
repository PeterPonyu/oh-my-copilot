#!/usr/bin/env bash
# translator-smoke.sh -- determinism + idempotency smoke for translate-omc-skill.mjs
#
# For each fixture in test-fixtures/:
#   1. Translate input -> tmp dir
#   2. Diff produced SKILL.md vs expected-output/SKILL.md
#   3. Diff produced _omc-port-diff.md vs expected-diff.md (if expected exists)
#   4. Re-run translator -- output must be byte-identical (idempotency)
#   5. --check against the tmp dir -- must exit 0 (no drift)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRANSLATOR="$SCRIPT_DIR/translate-omc-skill.mjs"
FIXTURES_DIR="$SCRIPT_DIR/test-fixtures"

if [[ ! -f "$TRANSLATOR" ]]; then
  echo "smoke: translator not found at $TRANSLATOR" >&2
  exit 1
fi
if [[ ! -d "$FIXTURES_DIR" ]]; then
  echo "smoke: fixtures dir not found at $FIXTURES_DIR" >&2
  exit 1
fi

TMP_ROOT="$(mktemp -d -t omc-translator-smoke.XXXXXX)"
trap 'rm -rf "$TMP_ROOT"' EXIT

fail() {
  local fixture="$1" step="$2" detail="$3"
  echo "smoke FAIL: fixture=$fixture step=$step" >&2
  echo "$detail" >&2
  exit 1
}

run_fixture() {
  local fixture_dir="$1"
  local fixture_name
  fixture_name="$(basename "$fixture_dir")"
  local input_dir="$fixture_dir/input"
  local expected_skill="$fixture_dir/expected-output/SKILL.md"
  local expected_diff="$fixture_dir/expected-diff.md"
  local out1="$TMP_ROOT/$fixture_name/run1"
  local out2="$TMP_ROOT/$fixture_name/run2"

  echo "smoke: $fixture_name :: step 1 translate"
  node "$TRANSLATOR" "$input_dir" "$out1" >/dev/null

  echo "smoke: $fixture_name :: step 2 diff SKILL.md"
  if ! diff -u "$expected_skill" "$out1/SKILL.md"; then
    fail "$fixture_name" "skill-diff" "SKILL.md differs from expected-output"
  fi

  if [[ -f "$expected_diff" ]]; then
    echo "smoke: $fixture_name :: step 3 diff _omc-port-diff.md"
    if ! diff -u "$expected_diff" "$out1/_omc-port-diff.md"; then
      fail "$fixture_name" "diff-md" "_omc-port-diff.md differs from expected"
    fi
  else
    echo "smoke: $fixture_name :: step 3 skipped (no expected-diff.md; no-op fixture)"
  fi

  echo "smoke: $fixture_name :: step 4 idempotency"
  node "$TRANSLATOR" "$input_dir" "$out2" >/dev/null
  if ! diff -u "$out1/SKILL.md" "$out2/SKILL.md"; then
    fail "$fixture_name" "idempotency" "second-run SKILL.md differs from first-run"
  fi

  echo "smoke: $fixture_name :: step 5 --check (drift detection)"
  if ! node "$TRANSLATOR" "$input_dir" "$out1" --check >/dev/null; then
    fail "$fixture_name" "check-drift" "--check against first-run dir flagged drift"
  fi

  echo "smoke: $fixture_name :: PASS"
}

shopt -s nullglob
fixtures=("$FIXTURES_DIR"/fixture-*)
shopt -u nullglob

if [[ ${#fixtures[@]} -eq 0 ]]; then
  echo "smoke: no fixtures matched in $FIXTURES_DIR" >&2
  exit 1
fi

for f in "${fixtures[@]}"; do
  [[ -d "$f" ]] || continue
  run_fixture "$f"
done

echo "smoke: all ${#fixtures[@]} fixture(s) PASSED"
