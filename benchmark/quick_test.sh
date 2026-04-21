#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(python3 "$SCRIPT_DIR/../scripts/resolve-canonical-root.py" "$SCRIPT_DIR/..")"
cd "$ROOT"

has_flag() {
  local needle="$1"
  shift
  local arg
  for arg in "$@"; do
    if [[ "$arg" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

resolve_variant() {
  local next_is_variant=0
  local arg
  for arg in "$@"; do
    if [[ "$next_is_variant" == "1" ]]; then
      printf '%s\n' "$arg"
      return 0
    fi
    case "$arg" in
      --variant)
        next_is_variant=1
        ;;
      --variant=*)
        printf '%s\n' "${arg#--variant=}"
        return 0
        ;;
      --run-agent-smoke)
        printf 'enhanced\n'
        return 0
        ;;
    esac
  done
  printf 'vanilla\n'
}

if has_flag "--output-dir" "$@" || printf '%s\0' "$@" | grep -Fzq -- '--output-dir='; then
  python3 benchmark/run_benchmark.py --profile quick "$@"
  exit $?
fi

variant="$(resolve_variant "$@")"
case "$variant" in
  enhanced)
    output_dir="benchmark/results/current-quick-enhanced"
    ;;
  vanilla|auto)
    output_dir="benchmark/results/current-quick-vanilla"
    ;;
  *)
    printf 'FAIL: unsupported quick_test variant: %s\n' "$variant" >&2
    exit 1
    ;;
esac

python3 benchmark/run_benchmark.py --profile quick --output-dir "$output_dir" "$@"
