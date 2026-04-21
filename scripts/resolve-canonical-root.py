#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def looks_like_repo_root(path: Path) -> bool:
    return (
        (path / 'AGENTS.md').is_file()
        and (path / 'packages' / 'copilot-cli-plugin' / 'plugin.json').is_file()
        and (path / 'benchmark').is_dir()
    )


def collapse_omx_team_worktree(path: Path) -> Path | None:
    parts = path.resolve().parts
    for idx, part in enumerate(parts):
        if part != '.omx':
            continue
        if idx + 3 >= len(parts):
            continue
        if parts[idx + 1] != 'team':
            continue
        tail = parts[idx + 2 :]
        if 'worktrees' not in tail:
            continue
        candidate = Path(*parts[:idx]) if idx > 0 else Path(parts[0])
        if looks_like_repo_root(candidate):
            return candidate
    return None


def git_toplevel(path: Path) -> Path | None:
    try:
        proc = subprocess.run(
            ['git', 'rev-parse', '--show-toplevel'],
            cwd=str(path),
            text=True,
            capture_output=True,
            check=True,
        )
    except Exception:
        return None
    value = proc.stdout.strip()
    if not value:
        return None
    return Path(value).resolve()


def resolve_canonical_root(raw: str) -> Path:
    start = Path(raw).expanduser().resolve()

    collapsed = collapse_omx_team_worktree(start)
    if collapsed is not None:
        return collapsed

    current = start
    if current.is_file():
        current = current.parent

    for candidate in [current, *current.parents]:
        if looks_like_repo_root(candidate):
            return candidate

    git_root = git_toplevel(current)
    if git_root is not None:
        return git_root

    return current


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else '.'
    print(resolve_canonical_root(target))
