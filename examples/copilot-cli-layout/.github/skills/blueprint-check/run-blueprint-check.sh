#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [[ -x "$ROOT/scripts/validate-doc-links.sh" ]]; then
  "$ROOT/scripts/validate-doc-links.sh" --root "$ROOT"
else
  echo "FAIL: validate-doc-links.sh not found at repo root" >&2
  exit 1
fi
