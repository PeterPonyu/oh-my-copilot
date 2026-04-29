#!/usr/bin/env python3
"""Rubric-judge paired vanilla vs with-omc responses with Claude Haiku 4.5.

Usage:
    python rubric_judge.py \
        --pairs /path/to/paired_pairs.jsonl \
        --judgments-dir /path/to/judgments \
        --output /path/to/rubric_scores.jsonl \
        --max-spend-usd 5.0
"""
from __future__ import annotations

import argparse
import json
import random
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


RUBRIC_SYSTEM = (
    "You are a strict, structured code-task judge. You output ONLY valid JSON, no prose, no markdown fences."
)


RUBRIC_TEMPLATE = """You are a strict, structured code-task judge. Two assistants (A and B) responded to the same task. Rate each on a 1-5 scale across 4 dimensions:

- correctness: factually correct, no fabrications. 1=multiple errors / hallucinations. 5=fully correct, all claims grounded.
- structure: well-organized output (headers, numbering, severity tags, etc. as the task implied). 1=stream of unstructured prose. 5=cleanly structured per the task's implied contract.
- scope_honesty: honors the asked scope. 1=invents unrequested files/changes/agents/integrations. 5=stays in scope.
- calibration: surfaces uncertainty appropriately. 1=overconfident or hand-waves. 5=marks assumptions, lists open questions.

Task: {prompt}
Expected signals (the task's implicit checklist): {expected_signals}

Response A:
{response_a}

Response B:
{response_b}

Output format (JSON only, no prose):
{{"A":{{"correctness":N,"structure":N,"scope_honesty":N,"calibration":N}},
 "B":{{"correctness":N,"structure":N,"scope_honesty":N,"calibration":N}},
 "winner":"A"|"B"|"tie",
 "rationale":"<one short paragraph>"}}
"""


def truncate(text: str, max_chars: int = 8000) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n[...truncated...]"


def call_claude_judge(prompt: str, max_budget: float = 0.05) -> dict[str, Any]:
    """Call Claude Haiku via the claude --print CLI. Returns parsed JSON judge output + cost."""
    cmd = [
        "claude",
        "--print",
        "--model", "haiku",
        "--output-format", "json",
        "--max-budget-usd", str(max_budget),
        "--system-prompt", RUBRIC_SYSTEM,
        "--disallowedTools", "Bash,Edit,Write,Read,Glob,Grep,WebFetch,WebSearch,Task",
    ]
    proc = subprocess.run(
        cmd,
        input=prompt,
        capture_output=True,
        text=True,
        timeout=240,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"claude CLI failed exit={proc.returncode}\nstderr={proc.stderr[:500]}\nstdout={proc.stdout[:500]}"
        )
    raw = proc.stdout.strip()
    # claude --output-format json returns an envelope: {"result": "...", "total_cost_usd": ..., ...}
    try:
        envelope = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"failed to parse claude envelope: {e}\nraw[:800]={raw[:800]}")
    result_text = envelope.get("result", "")
    cost = envelope.get("total_cost_usd", envelope.get("cost_usd", 0.0))
    # Extract JSON object from result_text (model may wrap in fences despite system prompt)
    judge_json = parse_judge_json(result_text)
    return {"judgment": judge_json, "cost_usd": float(cost or 0.0), "raw_envelope": envelope}


def parse_judge_json(text: str) -> dict[str, Any]:
    """Robustly extract the first JSON object from text."""
    text = text.strip()
    # Strip code fences if any
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Find first { and matching } via depth scan
    start = text.find("{")
    if start < 0:
        raise ValueError(f"no JSON object found in: {text[:300]}")
    depth = 0
    for i in range(start, len(text)):
        c = text[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                blob = text[start:i + 1]
                return json.loads(blob)
    raise ValueError(f"unbalanced JSON in: {text[:300]}")


def validate_judgment(j: dict[str, Any]) -> bool:
    try:
        for side in ("A", "B"):
            for dim in ("correctness", "structure", "scope_honesty", "calibration"):
                v = int(j[side][dim])
                if v < 1 or v > 5:
                    return False
        if j.get("winner") not in ("A", "B", "tie"):
            return False
        return True
    except (KeyError, TypeError, ValueError):
        return False


def judge_pair(pair: dict[str, Any], rng: random.Random) -> dict[str, Any]:
    """Anonymize ordering, judge, return record."""
    # Random A/B ordering
    if rng.random() < 0.5:
        ordering = {"A": "vanilla", "B": "with_omc"}
        text_a = pair["vanilla"]["text"]
        text_b = pair["with_omc"]["text"]
    else:
        ordering = {"A": "with_omc", "B": "vanilla"}
        text_a = pair["with_omc"]["text"]
        text_b = pair["vanilla"]["text"]

    expected = pair.get("expected_signals", [])
    expected_str = ", ".join(expected) if expected else "(none specified)"
    prompt = RUBRIC_TEMPLATE.format(
        prompt=pair["prompt"],
        expected_signals=expected_str,
        response_a=truncate(text_a),
        response_b=truncate(text_b),
    )

    result = call_claude_judge(prompt)
    judgment = result["judgment"]
    if not validate_judgment(judgment):
        raise RuntimeError(f"invalid judgment shape: {json.dumps(judgment)[:400]}")

    return {
        "repo": pair["repo"],
        "task_id": pair["task_id"],
        "skill": pair["skill"],
        "difficulty": pair["difficulty"],
        "ordering": ordering,
        "scores": {"A": judgment["A"], "B": judgment["B"]},
        "winner": judgment["winner"],
        "rationale": judgment.get("rationale", ""),
        "judge_cost_usd": result["cost_usd"],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", required=True, type=Path)
    ap.add_argument("--judgments-dir", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--max-spend-usd", type=float, default=5.0)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    args.judgments_dir.mkdir(parents=True, exist_ok=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)

    rng = random.Random(args.seed)

    pairs: list[dict[str, Any]] = []
    with args.pairs.open() as f:
        for line in f:
            line = line.strip()
            if line:
                pairs.append(json.loads(line))

    print(f"Loaded {len(pairs)} pairs", file=sys.stderr)

    total_spend = 0.0
    judgments: list[dict[str, Any]] = []
    completed = 0
    skipped = 0
    failed: list[tuple[str, str, str]] = []

    # Resume from existing per-pair files
    for pair in pairs:
        task_id = pair["task_id"]
        repo = pair["repo"]
        per_path = args.judgments_dir / f"{task_id}__{repo}.json"
        if per_path.exists():
            try:
                rec = json.loads(per_path.read_text())
                judgments.append(rec)
                total_spend += float(rec.get("judge_cost_usd", 0.0) or 0.0)
                skipped += 1
                continue
            except Exception:
                pass  # re-judge

        if total_spend >= args.max_spend_usd:
            print(f"BUDGET CAP HIT: ${total_spend:.4f} >= ${args.max_spend_usd}, aborting", file=sys.stderr)
            break

        try:
            t0 = time.time()
            rec = judge_pair(pair, rng)
            dt = time.time() - t0
            per_path.write_text(json.dumps(rec, indent=2))
            judgments.append(rec)
            total_spend += rec["judge_cost_usd"]
            completed += 1
            print(
                f"[{completed + skipped}/{len(pairs)}] {repo}/{task_id} winner={rec['winner']} "
                f"cost=${rec['judge_cost_usd']:.4f} cum=${total_spend:.4f} dt={dt:.1f}s",
                file=sys.stderr,
            )
        except Exception as e:
            failed.append((repo, task_id, str(e)[:200]))
            print(f"FAIL {repo}/{task_id}: {e}", file=sys.stderr)

    # Write aggregated JSONL
    with args.output.open("w") as f:
        for rec in judgments:
            f.write(json.dumps(rec) + "\n")

    print("=" * 60, file=sys.stderr)
    print(f"Completed: {completed} new, {skipped} resumed, {len(failed)} failed", file=sys.stderr)
    print(f"Total spend: ${total_spend:.4f}", file=sys.stderr)
    print(f"Output: {args.output}", file=sys.stderr)
    if failed:
        print("Failures:", file=sys.stderr)
        for repo, tid, err in failed:
            print(f"  {repo}/{tid}: {err}", file=sys.stderr)
    return 0 if not failed else 1


if __name__ == "__main__":
    sys.exit(main())
