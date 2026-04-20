#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECK_EXTERNAL="${CHECK_EXTERNAL:-0}"

cd "$ROOT"

if ! command -v python3 >/dev/null 2>&1; then
  echo "FAIL: python3 is required for internal markdown link validation" >&2
  exit 1
fi

python3 - <<'PY'
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

root = Path.cwd()
errors: list[str] = []
link_re = re.compile(r"(?<!!)[^!]\[([^\]]*)\]\(([^)]+)\)")
heading_re = re.compile(r"^(#{1,6})\s+(.+?)\s*$")

def slugify(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[`*_{}\[\]()]", "", text)
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")

def collect_anchors(path: Path) -> set[str]:
    anchors: set[str] = set()
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return anchors
    counts: dict[str, int] = {}
    for line in text.splitlines():
        match = heading_re.match(line)
        if not match:
            continue
        base = slugify(match.group(2))
        if not base:
            continue
        count = counts.get(base, 0)
        counts[base] = count + 1
        anchors.add(base if count == 0 else f"{base}-{count}")
    return anchors

markdown_files = [p for p in root.rglob("*.md") if ".git" not in p.parts and ".omx" not in p.parts]
anchors = {p: collect_anchors(p) for p in markdown_files}

for path in markdown_files:
    text = path.read_text(encoding="utf-8")
    for lineno, line in enumerate(text.splitlines(), 1):
        for match in link_re.finditer(line):
            target = match.group(2).strip()
            if not target or target.startswith(("http://", "https://", "mailto:")):
                continue
            if target.startswith("#"):
                dest = path
                fragment = target[1:]
            else:
                raw_path, sep, fragment = target.partition("#")
                raw_path = raw_path.split("?", 1)[0]
                dest = (path.parent / unquote(raw_path)).resolve()
                try:
                    dest.relative_to(root)
                except ValueError:
                    errors.append(f"{path}:{lineno}: link escapes repository: {target}")
                    continue
            if not dest.exists():
                errors.append(f"{path}:{lineno}: missing target: {target}")
                continue
            if fragment and dest.suffix.lower() == ".md":
                wanted = slugify(unquote(fragment))
                if wanted and wanted not in anchors.get(dest, set()):
                    errors.append(f"{path}:{lineno}: missing heading '#{fragment}' in {dest.relative_to(root)}")

if errors:
    print("Internal markdown link check FAILED", file=sys.stderr)
    for error in errors:
        print(f"- {error}", file=sys.stderr)
    sys.exit(1)

print(f"Internal markdown link check passed ({len(markdown_files)} markdown files).")
PY

if [[ "$CHECK_EXTERNAL" == "1" ]]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "FAIL: curl is required when CHECK_EXTERNAL=1" >&2
    exit 1
  fi
  mapfile -t urls < <(grep -RhoE 'https?://[^) >]+' -- *.md docs research examples 2>/dev/null | sed 's/[),.;]*$//' | sort -u || true)
  failures=0
  for url in "${urls[@]}"; do
    [[ -z "$url" ]] && continue
    if curl --location --head --silent --show-error --fail --max-time 20 "$url" >/dev/null; then
      echo "OK $url"
    else
      echo "FAIL $url" >&2
      failures=$((failures + 1))
    fi
  done
  if (( failures > 0 )); then
    echo "External link check failed for $failures URL(s)." >&2
    exit 1
  fi
  echo "External link check passed (${#urls[@]} URL(s))."
fi
