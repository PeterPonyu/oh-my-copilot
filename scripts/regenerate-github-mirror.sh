#!/usr/bin/env bash
# regenerate-github-mirror.sh
#
# Generates .github/{agents,skills,prompts}/ from the canonical plugin sources:
#   packages/copilot-cli-plugin/{agents,skills,commands}/
#
# Usage:
#   ./scripts/regenerate-github-mirror.sh
#   ./scripts/regenerate-github-mirror.sh --dry-run
#   ./scripts/regenerate-github-mirror.sh --dry-run --to /tmp/mirror-check-$$
#
# The --to flag redirects output to an alternate root (used by check-mirror-drift.sh).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
DRY_RUN=0
DEST_ROOT="${REPO_ROOT}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --to)
      DEST_ROOT="$2"
      shift 2
      # Guard: --to must be absolute and not /
      if [[ "${DEST_ROOT}" == "/" || ! "${DEST_ROOT}" == /* ]]; then
        echo "ERROR: --to must be an absolute path that is not /" >&2
        exit 1
      fi
      # Soft guard: if DEST_ROOT is outside the repo and not under /tmp, warn
      if [[ "${DEST_ROOT}" != "${REPO_ROOT}"* && "${DEST_ROOT}" != /tmp/* ]]; then
        echo "WARN: --to is outside REPO_ROOT and /tmp; refusing for safety" >&2
        exit 1
      fi
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Source and destination paths
# ---------------------------------------------------------------------------
PLUGIN_AGENTS="${REPO_ROOT}/packages/copilot-cli-plugin/agents"
PLUGIN_SKILLS="${REPO_ROOT}/packages/copilot-cli-plugin/skills"
PLUGIN_COMMANDS="${REPO_ROOT}/packages/copilot-cli-plugin/commands"

DEST_AGENTS="${DEST_ROOT}/.github/agents"
DEST_SKILLS="${DEST_ROOT}/.github/skills"
DEST_PROMPTS="${DEST_ROOT}/.github/prompts"

MIRROR_NOTE="MIRROR_FROM_PLUGIN.md"

FILES_WRITTEN=0
FILES_DELETED=0

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
log() {
  echo "$*"
}

maybe_mkdir() {
  local dir="$1"
  if [[ "${DRY_RUN}" -eq 0 ]]; then
    mkdir -p "${dir}"
  fi
}

# ---------------------------------------------------------------------------
# Clear destination mirror dirs (preserve MIRROR_FROM_PLUGIN.md)
# ---------------------------------------------------------------------------
clear_dest() {
  local dest="$1"
  if [[ ! -d "${dest}" ]]; then
    return
  fi
  while IFS= read -r -d '' f; do
    local rel="${f#${dest}/}"
    if [[ "${rel}" == "${MIRROR_NOTE}" ]]; then
      continue
    fi
    if [[ "${DRY_RUN}" -eq 1 ]]; then
      log "  [dry-run] would delete: ${f}"
    else
      rm -rf "${f}"
      log "  deleted: ${f}"
    fi
    FILES_DELETED=$((FILES_DELETED + 1))
  done < <(find "${dest}" -mindepth 1 -maxdepth 1 -print0 | sort -z)
}

# ---------------------------------------------------------------------------
# Copy agents: .agent.md -> .agent.md (name unchanged)
# ---------------------------------------------------------------------------
mirror_agents() {
  maybe_mkdir "${DEST_AGENTS}"
  clear_dest "${DEST_AGENTS}"
  while IFS= read -r -d '' src; do
    local filename
    filename="$(basename "${src}")"
    local dest_file="${DEST_AGENTS}/${filename}"
    if [[ "${DRY_RUN}" -eq 1 ]]; then
      log "  [dry-run] would write: ${dest_file}"
    else
      cp "${src}" "${dest_file}"
      log "  written: ${dest_file}"
    fi
    FILES_WRITTEN=$((FILES_WRITTEN + 1))
  done < <(find "${PLUGIN_AGENTS}" -maxdepth 1 -name "*.agent.md" -print0 | sort -z)
}

# ---------------------------------------------------------------------------
# Copy skills: preserve directory structure
# ---------------------------------------------------------------------------
mirror_skills() {
  maybe_mkdir "${DEST_SKILLS}"
  clear_dest "${DEST_SKILLS}"
  while IFS= read -r -d '' src; do
    local rel="${src#${PLUGIN_SKILLS}/}"
    local dest_file="${DEST_SKILLS}/${rel}"
    local dest_dir
    dest_dir="$(dirname "${dest_file}")"
    if [[ "${DRY_RUN}" -eq 1 ]]; then
      log "  [dry-run] would write: ${dest_file}"
    else
      mkdir -p "${dest_dir}"
      cp "${src}" "${dest_file}"
      log "  written: ${dest_file}"
    fi
    FILES_WRITTEN=$((FILES_WRITTEN + 1))
  done < <(find "${PLUGIN_SKILLS}" -type f -print0 | sort -z)
}

# ---------------------------------------------------------------------------
# Copy commands: .md -> .prompt.md (rename extension)
# ---------------------------------------------------------------------------
mirror_prompts() {
  maybe_mkdir "${DEST_PROMPTS}"
  clear_dest "${DEST_PROMPTS}"
  while IFS= read -r -d '' src; do
    local filename
    filename="$(basename "${src}" .md)"
    local dest_file="${DEST_PROMPTS}/${filename}.prompt.md"
    if [[ "${DRY_RUN}" -eq 1 ]]; then
      log "  [dry-run] would write: ${dest_file}"
    else
      cp "${src}" "${dest_file}"
      log "  written: ${dest_file}"
    fi
    FILES_WRITTEN=$((FILES_WRITTEN + 1))
  done < <(find "${PLUGIN_COMMANDS}" -maxdepth 1 -name "*.md" -print0 | sort -z)
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if [[ "${DRY_RUN}" -eq 1 ]]; then
  log "=== regenerate-github-mirror (dry-run) ==="
else
  log "=== regenerate-github-mirror ==="
fi

log ""
log "Source agents:   ${PLUGIN_AGENTS}"
log "Source skills:   ${PLUGIN_SKILLS}"
log "Source commands: ${PLUGIN_COMMANDS}"
log "Dest root:       ${DEST_ROOT}"
log ""

log "--- agents ---"
mirror_agents

log ""
log "--- skills ---"
mirror_skills

log ""
log "--- prompts (from commands) ---"
mirror_prompts

log ""
log "Done. Files written: ${FILES_WRITTEN}  Orphans deleted: ${FILES_DELETED}"
