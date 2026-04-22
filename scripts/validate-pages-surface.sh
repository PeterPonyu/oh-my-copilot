#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf 'ok: %s\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
bounded() { printf 'bounded: %s\n' "$*"; }

SITE_ROOT="apps/cross-host-benchmark-site"
WORKFLOW=".github/workflows/deploy-pages.yml"
EXPORT_HTML="$SITE_ROOT/out/index.html"

if [[ ! -d "$SITE_ROOT" ]]; then
  bounded "no checked-in Pages app found at $SITE_ROOT; flagship landing proof remains inactive"
  exit 0
fi

required_app_files=(
  "$SITE_ROOT/package.json"
  "$SITE_ROOT/pnpm-lock.yaml"
  "$SITE_ROOT/pnpm-workspace.yaml"
  "$SITE_ROOT/eslint.config.mjs"
  "$SITE_ROOT/tsconfig.json"
  "$SITE_ROOT/next-env.d.ts"
  "$SITE_ROOT/next.config.ts"
  "$SITE_ROOT/app/layout.tsx"
  "$SITE_ROOT/app/page.tsx"
  "$SITE_ROOT/app/methodology/page.tsx"
  "$SITE_ROOT/app/history/page.tsx"
)

for path in "${required_app_files[@]}"; do
  [[ -f "$path" ]] || fail "missing required Pages file: $path"
  log "$path"
done

[[ -f "$WORKFLOW" ]] || fail "missing Pages deploy workflow: $WORKFLOW"
log "$WORKFLOW"

grep -Eq "output:\s*'export'|output:\s*\"export\"" "$SITE_ROOT/next.config.ts" \
  || fail "next.config.ts must keep output: 'export'"
log "next.config.ts keeps static export output"

grep -Eq 'actions/upload-pages-artifact@v[0-9]+' "$WORKFLOW" \
  || fail "deploy workflow must use actions/upload-pages-artifact"
grep -Eq 'actions/deploy-pages@v[0-9]+' "$WORKFLOW" \
  || fail "deploy workflow must use actions/deploy-pages"
grep -q "$SITE_ROOT/out" "$WORKFLOW" \
  || fail "deploy workflow must upload $SITE_ROOT/out"
log "deploy workflow uses official Pages artifact/deploy actions"

if [[ -f "$EXPORT_HTML" ]]; then
  log "$EXPORT_HTML"

  grep -qi 'oh-my-copilot' "$EXPORT_HTML" \
    || fail "exported landing HTML must lead with oh-my-copilot naming"
  grep -qi '>Methodology<' "$EXPORT_HTML" \
    || fail "exported landing HTML must keep a visible Methodology link"
  grep -qi '>History<' "$EXPORT_HTML" \
    || fail "exported landing HTML must keep a visible History link"
  grep -qi '>Benchmark docs<' "$EXPORT_HTML" \
    || fail "exported landing HTML must keep a visible Benchmark docs link"
  grep -qi '>References<' "$EXPORT_HTML" \
    || fail "exported landing HTML must keep a visible References link"
  grep -qi 'oh-my-cursor' "$EXPORT_HTML" \
    || fail "exported landing HTML must include the sibling oh-my-cursor link"
  grep -qi 'reporting-comparable' "$EXPORT_HTML" \
    || fail "exported landing HTML must preserve reporting-comparable framing"
  log "exported landing HTML preserves required naming, proof links, sibling link, and reporting-comparable wording"
else
  bounded "missing exported landing HTML: $EXPORT_HTML; falling back to source assertions"
  grep -q 'oh-my-copilot' "$SITE_ROOT/app/layout.tsx" \
    || fail "layout.tsx must lead with oh-my-copilot naming"
  grep -q 'Methodology' "$SITE_ROOT/app/layout.tsx" \
    || fail "layout.tsx must expose the Methodology route"
  grep -q 'History' "$SITE_ROOT/app/layout.tsx" \
    || fail "layout.tsx must expose the History route"
  grep -q 'Benchmark docs' "$SITE_ROOT/app/layout.tsx" \
    || fail "layout.tsx must expose the Benchmark docs link"
  grep -q 'References' "$SITE_ROOT/app/layout.tsx" \
    || fail "layout.tsx must expose the References link"
  grep -q 'Sibling: oh-my-cursor' "$SITE_ROOT/app/layout.tsx" \
    || fail "layout.tsx must expose the sibling oh-my-cursor link"
  grep -q 'reporting-comparable' "$SITE_ROOT/app/page.tsx" \
    || fail "page.tsx must preserve reporting-comparable framing"
  log "source files preserve required naming, links, sibling context, and reporting-comparable wording"
fi
