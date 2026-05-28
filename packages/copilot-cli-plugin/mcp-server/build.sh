#!/usr/bin/env bash
# Build the mcp-server bundle.
#
# Production install needs only `dist/server.mjs` (committed). This script
# rebuilds the bundle for development. End-user plugin installs do NOT need
# to run this — the committed bundle is shipped as-is.
#
# Steps:
#   1. Install dev dependencies (esbuild + the MCP SDK) if node_modules is
#      stale. Idempotent via package-lock.json checksum.
#   2. Run esbuild to produce dist/server.mjs (single-file ESM bundle that
#      inlines the SDK + all stores). ~616KB.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CHECKSUM_FILE=".build-checksum"
NODE_MODULES="node_modules"
BUNDLE="dist/server.mjs"

# Compute a checksum for dependencies and bundled sources. This keeps the
# idempotent build fast while still rebuilding when server/store code changes.
current_checksum="$(
  {
    [ -f package-lock.json ] && sha256sum package-lock.json
    find . ../orchestrator \
      -path ./node_modules -prune -o \
      -path ./dist -prune -o \
      -name "*.mjs" -type f -print0 \
      | sort -z \
      | xargs -0 sha256sum
  } | sha256sum | awk '{print $1}'
)"

# Idempotency: skip npm install if node_modules + bundle present and unchanged
if [ -d "$NODE_MODULES" ] && [ -f "$CHECKSUM_FILE" ] && [ -f "$BUNDLE" ]; then
  stored_checksum="$(cat "$CHECKSUM_FILE")"
  if [ "$current_checksum" = "$stored_checksum" ]; then
    echo "oh-my-copilot-mcp-server: build artifacts up to date, skipping rebuild"
    exit 0
  fi
fi

echo "oh-my-copilot-mcp-server: installing dependencies (npm install)..."
npm install

echo "oh-my-copilot-mcp-server: bundling server.mjs -> $BUNDLE..."
mkdir -p dist
npx esbuild server.mjs \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=esm \
  --outfile="$BUNDLE"
chmod +x "$BUNDLE"

printf '%s\n' "$current_checksum" > "$CHECKSUM_FILE"

echo "oh-my-copilot-mcp-server: build complete ($(du -h "$BUNDLE" | cut -f1))"
