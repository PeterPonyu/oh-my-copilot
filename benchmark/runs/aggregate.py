#!/usr/bin/env python3
"""Aggregate paired vanilla vs with-omc per-task records into a JSONL.

Usage:
    python aggregate.py \
        --cursor-vanilla /path/to/cursor-vanilla-run \
        --cursor-omc     /path/to/cursor-with-omc-run \
        --copilot-vanilla /path/to/copilot-vanilla-run \
        --copilot-omc    /path/to/copilot-with-omc-run \
        --tasks /path/to/a1_full_tasks.json \
        --output /path/to/paired_pairs.jsonl
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


def load_tasks(tasks_path: Path) -> dict[str, dict[str, Any]]:
    with tasks_path.open() as f:
        tasks = json.load(f)
    return {t["id"]: t for t in tasks}


def load_per_task(run_dir: Path, task_id: str) -> dict[str, Any] | None:
    """Load metadata + response.md for one task. Returns None on hard miss."""
    task_dir = run_dir / "per-task" / task_id
    if not task_dir.exists():
        return None
    meta_p = task_dir / "metadata.json"
    resp_p = task_dir / "response.md"
    if not meta_p.exists():
        return None
    meta = json.loads(meta_p.read_text())
    text = resp_p.read_text() if resp_p.exists() else ""
    tokens = meta.get("tokens") or {}
    return {
        "text": text,
        "tokens": tokens,
        "cost_usd": meta.get("cost_usd"),
        "wallclock_ms": meta.get("wallclock_ms"),
        "status": meta.get("status", "ok"),
        "error": meta.get("error"),
    }


def aggregate_repo(
    repo_name: str,
    vanilla_dir: Path,
    omc_dir: Path,
    tasks: dict[str, dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    pairs: list[dict[str, Any]] = []
    drops = {
        "vanilla_missing": 0,
        "omc_missing": 0,
        "vanilla_error": 0,
        "omc_error": 0,
        "kept": 0,
    }
    for task_id, task in tasks.items():
        v = load_per_task(vanilla_dir, task_id)
        o = load_per_task(omc_dir, task_id)
        if v is None:
            drops["vanilla_missing"] += 1
            continue
        if o is None:
            drops["omc_missing"] += 1
            continue
        if v["status"] != "ok":
            drops["vanilla_error"] += 1
            continue
        if o["status"] != "ok":
            drops["omc_error"] += 1
            continue
        pair = {
            "repo": repo_name,
            "task_id": task_id,
            "skill": task.get("skill"),
            "difficulty": task.get("difficulty"),
            "category": task.get("category"),
            "prompt": task.get("prompt"),
            "expected_signals": task.get("expected_signals", []),
            "vanilla": v,
            "with_omc": o,
        }
        pairs.append(pair)
        drops["kept"] += 1
    return pairs, drops


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cursor-vanilla", required=True, type=Path)
    ap.add_argument("--cursor-omc", required=True, type=Path)
    ap.add_argument("--copilot-vanilla", required=True, type=Path)
    ap.add_argument("--copilot-omc", required=True, type=Path)
    ap.add_argument("--tasks", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    args = ap.parse_args()

    tasks = load_tasks(args.tasks)
    print(f"Loaded {len(tasks)} task definitions", file=sys.stderr)

    cursor_pairs, cursor_drops = aggregate_repo(
        "cursor", args.cursor_vanilla, args.cursor_omc, tasks
    )
    copilot_pairs, copilot_drops = aggregate_repo(
        "copilot", args.copilot_vanilla, args.copilot_omc, tasks
    )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w") as f:
        for p in cursor_pairs + copilot_pairs:
            f.write(json.dumps(p) + "\n")

    print("=" * 60, file=sys.stderr)
    print(f"Cursor:  kept={cursor_drops['kept']} drops={cursor_drops}", file=sys.stderr)
    print(f"Copilot: kept={copilot_drops['kept']} drops={copilot_drops}", file=sys.stderr)
    print(f"Wrote {len(cursor_pairs) + len(copilot_pairs)} pairs -> {args.output}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
