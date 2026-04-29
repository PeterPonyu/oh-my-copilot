#!/usr/bin/env python3
"""Generate the top-N cursor case studies (largest with_omc - vanilla summed-rubric delta).

Usage:
    python make_case_studies.py \
        --pairs /path/to/paired_pairs.jsonl \
        --scores /path/to/rubric_scores.jsonl \
        --out-dir /path/to/case-studies \
        --vanilla-run-dir /path/to/cursor-vanilla-run \
        --omc-run-dir /path/to/cursor-omc-run \
        --top 5
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

DIMENSIONS = ("correctness", "structure", "scope_honesty", "calibration")


def load_jsonl(p: Path) -> list[dict[str, Any]]:
    out = []
    with p.open() as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def deanon_scores(rec: dict[str, Any]) -> tuple[dict[str, int], dict[str, int]]:
    o = rec["ordering"]
    s = rec["scores"]
    if o["A"] == "vanilla":
        return s["A"], s["B"]
    return s["B"], s["A"]


def trim(text: str, max_chars: int = 2400) -> str:
    if len(text) <= max_chars:
        return text
    head = text[: int(max_chars * 0.65)]
    tail = text[-int(max_chars * 0.30):]
    return head + "\n\n[...trimmed for case study...]\n\n" + tail


def write_case_study(
    out_dir: Path,
    case_idx: int,
    pair: dict[str, Any],
    rec: dict[str, Any],
    vanilla_scores: dict[str, int],
    omc_scores: dict[str, int],
    vanilla_run_dir: Path,
    omc_run_dir: Path,
) -> Path:
    task_id = pair["task_id"]
    skill = pair["skill"]
    case_id = f"C1-{case_idx:03d}"
    title = f"cursor/{task_id} ({skill})"

    v_md = pair["vanilla"]
    o_md = pair["with_omc"]

    summed_v = sum(vanilla_scores[d] for d in DIMENSIONS)
    summed_o = sum(omc_scores[d] for d in DIMENSIONS)
    delta = summed_o - summed_v

    v_transcript = vanilla_run_dir / "per-task" / task_id / "response.md"
    o_transcript = omc_run_dir / "per-task" / task_id / "response.md"

    md: list[str] = []
    md.append("---")
    md.append(f"case_id: {case_id}")
    md.append(f"task_type: {skill}")
    md.append(f"skill_under_test: {skill}")
    md.append("date: 2026-04-27")
    md.append("rater: claude-haiku-4-5 (LLM judge, A/B anonymized)")
    md.append("arm_a_model: cursor/auto (vanilla, no OMC skills)")
    md.append("arm_b_model: cursor/auto (with-omc, OMC skill catalog enabled)")
    md.append("---")
    md.append("")
    md.append(f"# Cursor C1 case study — {title}")
    md.append("")
    md.append("> This is a qualitative case study, not a statistical claim. N=1 by design.")
    md.append("")
    md.append("## Task description")
    md.append("")
    md.append(f"**Task id:** `{task_id}`  ")
    md.append(f"**Skill:** `{skill}`  ")
    md.append(f"**Difficulty:** `{pair.get('difficulty')}`  ")
    md.append(f"**Category:** `{pair.get('category')}`  ")
    md.append("")
    md.append("**Prompt (verbatim):**")
    md.append("")
    md.append("> " + pair["prompt"].replace("\n", "\n> "))
    md.append("")
    expected = pair.get("expected_signals") or []
    if expected:
        md.append("**Expected implicit signals:** " + ", ".join(f"`{s}`" for s in expected))
        md.append("")
    md.append(f"- Arm A (without-skill / vanilla) transcript: `{v_transcript}`")
    md.append(f"- Arm B (with-skill / with-omc) transcript:    `{o_transcript}`")
    md.append("")

    md.append("## Without-skill arm (vanilla)")
    md.append("")
    md.append("### Output (trimmed quote)")
    md.append("")
    md.append("```")
    md.append(trim(v_md["text"]))
    md.append("```")
    md.append("")
    md.append("### Observations")
    md.append("")
    md.append(f"- tokens: in={v_md['tokens'].get('input', v_md['tokens'].get('in', 'n/a'))}, "
              f"out={v_md['tokens'].get('output', v_md['tokens'].get('out', 'n/a'))}")
    md.append(f"- cost_usd: {v_md.get('cost_usd')}")
    md.append(f"- wallclock_ms: {v_md.get('wallclock_ms')}")
    md.append("")

    md.append("## With-skill arm (with-omc)")
    md.append("")
    md.append("### Output (trimmed quote)")
    md.append("")
    md.append("```")
    md.append(trim(o_md["text"]))
    md.append("```")
    md.append("")
    md.append("### Observations")
    md.append("")
    md.append(f"- tokens: in={o_md['tokens'].get('input', o_md['tokens'].get('in', 'n/a'))}, "
              f"out={o_md['tokens'].get('output', o_md['tokens'].get('out', 'n/a'))}")
    md.append(f"- cost_usd: {o_md.get('cost_usd')}")
    md.append(f"- wallclock_ms: {o_md.get('wallclock_ms')}")
    md.append("")

    md.append("## Comparative notes (judge's per-dimension scores, 1-5)")
    md.append("")
    md.append("| dimension | vanilla | with_omc | delta |")
    md.append("|---|---|---|---|")
    for dim in DIMENSIONS:
        md.append(f"| {dim} | {vanilla_scores[dim]} | {omc_scores[dim]} | {omc_scores[dim] - vanilla_scores[dim]:+d} |")
    md.append(f"| **summed** | **{summed_v}** | **{summed_o}** | **{delta:+d}** |")
    md.append("")

    md.append("## Honest negatives")
    md.append("")
    md.append("This pair was selected because the with-omc arm strongly outperformed the vanilla arm in the rubric judge's view; "
              "it is therefore not a balanced case. The judge is a single LLM (Claude Haiku 4.5) with anonymized A/B ordering, "
              "but it is still an LLM rather than a human rater. Apparent structure and calibration improvements may not always "
              "translate to downstream usefulness for a real engineer.")
    md.append("")

    md.append("## Verdict (qualitative)")
    md.append("")
    md.append(f"Judge declared **{rec['winner']}** the better response (de-anonymized: "
              f"{ 'with_omc' if (rec['winner'] != 'tie' and rec['ordering'][rec['winner']] == 'with_omc') else 'vanilla' if rec['winner'] != 'tie' else 'tie'}). "
              "Judge rationale (verbatim):")
    md.append("")
    md.append("> " + rec.get("rationale", "").replace("\n", "\n> "))
    md.append("")
    md.append("---")
    md.append("")
    md.append("This is a qualitative case study, NOT a statistical claim. N=1 by design.")
    md.append("")

    out_dir.mkdir(parents=True, exist_ok=True)
    fname = out_dir / f"case-study-{case_idx:02d}-{task_id}.md"
    fname.write_text("\n".join(md))
    return fname


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", required=True, type=Path)
    ap.add_argument("--scores", required=True, type=Path)
    ap.add_argument("--out-dir", required=True, type=Path)
    ap.add_argument("--vanilla-run-dir", required=True, type=Path)
    ap.add_argument("--omc-run-dir", required=True, type=Path)
    ap.add_argument("--top", type=int, default=5)
    args = ap.parse_args()

    pairs = load_jsonl(args.pairs)
    scores = load_jsonl(args.scores)

    pairs_by_id = {(p["repo"], p["task_id"]): p for p in pairs}
    cursor_scores = [s for s in scores if s["repo"] == "cursor"]

    ranked = []
    for rec in cursor_scores:
        v_s, o_s = deanon_scores(rec)
        delta = sum(o_s[d] for d in DIMENSIONS) - sum(v_s[d] for d in DIMENSIONS)
        ranked.append((delta, rec, v_s, o_s))
    ranked.sort(key=lambda x: x[0], reverse=True)
    top = ranked[: args.top]

    written: list[Path] = []
    for i, (delta, rec, v_s, o_s) in enumerate(top, start=1):
        pair = pairs_by_id[("cursor", rec["task_id"])]
        path = write_case_study(
            args.out_dir, i, pair, rec, v_s, o_s, args.vanilla_run_dir, args.omc_run_dir
        )
        written.append(path)
        print(f"Wrote {path} (delta={delta:+d})", file=sys.stderr)

    for p in written:
        print(p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
