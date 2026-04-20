#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/examples/vscode-copilot-layout"
TMP_DIR="${TMPDIR:-/tmp}/vscode-copilot-layout-standalone"

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
cp -a "$SRC/." "$TMP_DIR/"
rm -f "$TMP_DIR/.copilot-hooks/session.log" "$TMP_DIR/.copilot-hooks/tools.log" "$TMP_DIR/.copilot-hooks/warnings.log"

(
  cd "$TMP_DIR"
  printf '/exit\n' | copilot --allow-all >/dev/null
)

if [[ ! -f "$TMP_DIR/.copilot-hooks/session.log" ]]; then
  echo "FAIL: session.log was not created in standalone workspace" >&2
  exit 1
fi

echo "ok: standalone workspace hook proof succeeded"
echo "log:"
sed -n '1,40p' "$TMP_DIR/.copilot-hooks/session.log"
