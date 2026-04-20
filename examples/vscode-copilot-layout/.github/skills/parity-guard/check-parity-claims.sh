#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
python3 - "$ROOT" <<'PY'
from __future__ import annotations

import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
risk = re.compile(
    r"full feature parity|"
    r"same as oh-my-codex|same as oh-my-claudecode|"
    r"is a production runtime|implements.*tmux worker runtime|"
    r"v1.*(cloud agent|ide|sdk).*in scope",
    re.I,
)
allow = re.compile(
    r"\b(no|not|avoid|avoids|reject|rejected|prevent|prevents|out of scope|bounded|illustrative|future extension|non-goals|does not include|doesn't include)\b",
    re.I,
)

hits: list[str] = []
for path in root.rglob("*.md"):
    if ".git" in path.parts or ".omx" in path.parts:
        continue
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if risk.search(line) and not allow.search(line):
            hits.append(f"{path}:{lineno}:{line}")

if hits:
    print("\n".join(hits))
    raise SystemExit("FAIL: positive parity-risk or over-scope wording found")

print("ok: workspace wording stays bounded")
PY
