#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOCK_FILE="package-lock.json"
CHECKSUM_FILE=".build-checksum"
NODE_MODULES="node_modules"

# Compute checksum of package-lock.json if it exists
current_checksum=""
if [ -f "$LOCK_FILE" ]; then
  current_checksum="$(sha256sum "$LOCK_FILE" | awk '{print $1}')"
fi

# Idempotency check: skip if node_modules present and checksum unchanged
if [ -d "$NODE_MODULES" ] && [ -f "$CHECKSUM_FILE" ]; then
  stored_checksum="$(cat "$CHECKSUM_FILE")"
  if [ "$current_checksum" = "$stored_checksum" ]; then
    echo "oh-my-copilot-mcp-server: dependencies up to date, skipping npm install"
    exit 0
  fi
fi

echo "oh-my-copilot-mcp-server: installing dependencies (npm install --omit=dev)..."
npm install --omit=dev

# Store checksum for future idempotency checks
if [ -f "$LOCK_FILE" ]; then
  sha256sum "$LOCK_FILE" | awk '{print $1}' > "$CHECKSUM_FILE"
fi

echo "oh-my-copilot-mcp-server: build complete"
