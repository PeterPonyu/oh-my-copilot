#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

if [[ -x "$ROOT/scripts/validate-doc-links.sh" ]]; then
  "$ROOT/scripts/validate-doc-links.sh" --root "$ROOT"
elif [[ -x "./skills/parity-guard/check-parity-claims.sh" ]]; then
  ./skills/parity-guard/check-parity-claims.sh "$ROOT"
  echo "ok: fallback docs check completed"
else
  echo "FAIL: no docs validation path available" >&2
  exit 1
fi
