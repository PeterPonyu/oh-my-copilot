#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

failures=0

while IFS= read -r file; do
  while IFS= read -r target; do
    case "$target" in
      http://*|https://*|mailto:*|'')
        continue
        ;;
      \#*)
        continue
        ;;
    esac

    clean="${target%%#*}"
    clean="${clean//%20/ }"
    base="$(dirname "$file")"
    if [[ ! -e "$base/$clean" ]]; then
      printf 'Missing internal link in %s: %s\n' "$file" "$target" >&2
      failures=$((failures + 1))
    fi
  done < <(grep -oE '\[[^][]+\]\(([^() ]+)[^)]*\)' "$file" | sed -E 's/^.*\(([^() ]+).*\)$/\1/' || true)
done < <(find . -path './.git' -prune -o -name '*.md' -type f -print | sort)

if ! grep -R "https://docs.github.com\|https://github.blog" docs research README.md >/dev/null; then
  echo "No GitHub reference URLs found in docs/research/README" >&2
  failures=$((failures + 1))
fi

if grep -RInE 'full feature parity|runtime framework|cloud agent.*in scope|IDE.*in scope|SDK.*in scope' README.md docs research examples 2>/dev/null; then
  echo "Potential over-scope language found; review matches above" >&2
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  printf 'Documentation validation failed with %d issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'Documentation validation passed.\n'
