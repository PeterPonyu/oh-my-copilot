#!/usr/bin/env bash
# check-mirror-drift.sh
#
# CI-runnable check that .github/{agents,skills,prompts}/ is in sync with the
# canonical plugin sources in packages/copilot-cli-plugin/.
#
# Exits 0 if no drift; exits 1 and prints the diff if drift is detected.
#
# Usage:
#   ./scripts/check-mirror-drift.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="${REPO_ROOT}/scripts/regenerate-github-mirror.sh"
TMPDIR_BASE="${TMPDIR:-/tmp}"
WORK_DIR="${TMPDIR_BASE}/mirror-check-$$"

cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

mkdir -p "${WORK_DIR}/.github"

echo "=== check-mirror-drift ==="
echo "Generating mirror into ${WORK_DIR} ..."
bash "${SCRIPT}" --dry-run --to "${WORK_DIR}" > /dev/null 2>&1 || true
bash "${SCRIPT}" --to "${WORK_DIR}" > /dev/null 2>&1

echo "Comparing generated mirror against .github/{agents,skills,prompts}/ ..."

DIFF_OUTPUT="$(diff -r \
  --exclude="MIRROR_FROM_PLUGIN.md" \
  "${WORK_DIR}/.github/agents"  "${REPO_ROOT}/.github/agents" \
  "${WORK_DIR}/.github/skills"  "${REPO_ROOT}/.github/skills" \
  "${WORK_DIR}/.github/prompts" "${REPO_ROOT}/.github/prompts" \
  2>&1 || true)"

if [[ -z "${DIFF_OUTPUT}" ]]; then
  echo "OK — no drift detected."
  exit 0
else
  echo "FAIL — mirror is out of sync with plugin sources."
  echo ""
  echo "${DIFF_OUTPUT}"
  echo ""
  echo "Run ./scripts/regenerate-github-mirror.sh to update the mirror."
  exit 1
fi
