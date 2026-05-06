#!/usr/bin/env bash
# payload-audit.sh -- classify every item under packages/copilot-cli-plugin/
# as SHIPS or DEV-ONLY. Exit 0 if zero DEV-ONLY items; exit 1 otherwise.
#
# DEV-ONLY signals:
#   - filename ending in .test.mjs
#   - dir name: test-fixtures, tests, __tests__
#   - filename matching *-fixture-*
#   - _omc-port-diff.md is PORT-TIME provenance; lives in tools/omc-port/diffs/
#   - TODO_UNRESOLVED.md marks an unresolved port; lives in tools/omc-port/unresolved/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN_DIR="$REPO_ROOT/packages/copilot-cli-plugin"

if [[ ! -d "$PLUGIN_DIR" ]]; then
  echo "payload-audit: plugin dir not found at $PLUGIN_DIR" >&2
  exit 1
fi

ship_count=0
dev_count=0

classify() {
  local full_path="$1"
  local rel_path="${full_path#$PLUGIN_DIR/}"
  local base
  base="$(basename "$full_path")"

  # Check if any path component is a dev-only directory name
  local dev_dir=0
  local IFS_SAVE="$IFS"
  IFS='/'
  read -ra parts <<< "$rel_path"
  IFS="$IFS_SAVE"
  for part in "${parts[@]}"; do
    case "$part" in
      test-fixtures|tests|__tests__)
        dev_dir=1
        break
        ;;
    esac
  done

  if [[ $dev_dir -eq 1 ]]; then
    printf "DEV  | %-60s  %s\n" "$rel_path" "dev-only dir in path"
    (( dev_count++ )) || true
    return
  fi

  # Check filename patterns
  case "$base" in
    *.test.mjs)
      printf "DEV  | %-60s  %s\n" "$rel_path" "test file (.test.mjs)"
      (( dev_count++ )) || true
      return
      ;;
    *-fixture-*)
      printf "DEV  | %-60s  %s\n" "$rel_path" "fixture file (*-fixture-*)"
      (( dev_count++ )) || true
      return
      ;;
  esac

  # _omc-port-diff.md and TODO_UNRESOLVED.md are dev-only port-time artifacts.
  # They belong in tools/omc-port/{diffs,unresolved}/, not in the installed plugin.
  if [[ "$base" == "_omc-port-diff.md" ]]; then
    printf "DEV  | %-60s  %s\n" "$rel_path" "port-time diff (move to tools/omc-port/diffs/)"
    (( dev_count++ )) || true
    return
  fi
  if [[ "$base" == "TODO_UNRESOLVED.md" ]]; then
    printf "DEV  | %-60s  %s\n" "$rel_path" "unresolved port marker (move to tools/omc-port/unresolved/)"
    (( dev_count++ )) || true
    return
  fi

  printf "SHIP | %-60s  %s\n" "$rel_path" ""
  (( ship_count++ )) || true
}

echo "=== Payload audit: $PLUGIN_DIR ==="
echo ""

# Walk every file under the plugin dir
while IFS= read -r -d '' item; do
  # Skip the plugin dir itself
  [[ "$item" == "$PLUGIN_DIR" ]] && continue
  classify "$item"
done < <(find "$PLUGIN_DIR" -not -type d -print0 | sort -z)

echo ""
echo "--- Subdirectories of packages/copilot-cli-plugin/ ---"
for subdir in "$PLUGIN_DIR"/*/; do
  [[ -d "$subdir" ]] && echo "  $(basename "$subdir")/"
done

echo ""
echo "TOTAL SHIPS:    $ship_count"
echo "TOTAL DEV-ONLY: $dev_count"
echo ""

if [[ $dev_count -eq 0 ]]; then
  echo "PASS: zero DEV-ONLY items remain in plugin tree."
  exit 0
else
  echo "FAIL: $dev_count DEV-ONLY item(s) remain in plugin tree." >&2
  exit 1
fi
