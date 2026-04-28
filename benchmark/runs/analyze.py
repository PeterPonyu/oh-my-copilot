#!/usr/bin/env python3
"""Statistical analysis of paired rubric judgments + cost/latency aggregation.

Usage:
    python analyze.py \
        --pairs /path/to/paired_pairs.jsonl \
        --scores /path/to/rubric_scores.jsonl \
        --analysis-out /path/to/analysis.json \
        --report-out /path/to/REPORT.md
"""
from __future__ import annotations

import argparse
import json
import math
import random
import statistics
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


DIMENSIONS = ("correctness", "structure", "scope_honesty", "calibration")


# ---------- Stats helpers (stdlib only) ----------

def wilcoxon_signed_rank(diffs: list[float]) -> tuple[float, float, int]:
    """Two-sided paired Wilcoxon signed-rank test.

    Returns (W_statistic, p_value_normal_approx, n_nonzero).
    Uses normal approximation with tie correction. Zero diffs are dropped.
    """
    nonzero = [d for d in diffs if d != 0]
    n = len(nonzero)
    if n == 0:
        return (0.0, 1.0, 0)
    abs_diffs = [(abs(d), 1 if d > 0 else -1) for d in nonzero]
    # Rank with ties
    indexed = sorted(enumerate(abs_diffs), key=lambda x: x[1][0])
    ranks = [0.0] * n
    i = 0
    tie_groups: list[int] = []
    while i < n:
        j = i
        while j + 1 < n and indexed[j + 1][1][0] == indexed[i][1][0]:
            j += 1
        avg_rank = (i + j) / 2.0 + 1.0  # 1-indexed average
        group_size = j - i + 1
        for k in range(i, j + 1):
            orig_idx = indexed[k][0]
            ranks[orig_idx] = avg_rank
        if group_size > 1:
            tie_groups.append(group_size)
        i = j + 1
    w_plus = sum(r for r, (_, s) in zip(ranks, abs_diffs) if s > 0)
    w_minus = sum(r for r, (_, s) in zip(ranks, abs_diffs) if s < 0)
    W = min(w_plus, w_minus)

    mean_W = n * (n + 1) / 4.0
    var_W = n * (n + 1) * (2 * n + 1) / 24.0
    # Tie correction
    tie_adj = sum(t ** 3 - t for t in tie_groups) / 48.0
    var_W -= tie_adj
    if var_W <= 0:
        return (W, 1.0, n)
    # Continuity correction
    z = (W - mean_W + 0.5) / math.sqrt(var_W) if W < mean_W else (W - mean_W - 0.5) / math.sqrt(var_W)
    # Two-sided p
    p = 2.0 * (1.0 - normal_cdf(abs(z)))
    p = max(0.0, min(1.0, p))
    return (W, p, n)


def normal_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def bootstrap_ci(values: list[float], n_iter: int = 5000, alpha: float = 0.05, seed: int = 7) -> tuple[float, float]:
    """Percentile bootstrap CI for the mean."""
    if not values:
        return (float("nan"), float("nan"))
    rng = random.Random(seed)
    n = len(values)
    means = []
    for _ in range(n_iter):
        sample = [values[rng.randrange(n)] for _ in range(n)]
        means.append(sum(sample) / n)
    means.sort()
    lo = means[int(n_iter * alpha / 2)]
    hi = means[int(n_iter * (1 - alpha / 2))]
    return (lo, hi)


def safe_mean(xs: list[float]) -> float:
    return statistics.fmean(xs) if xs else float("nan")


# ---------- Load data ----------

def load_jsonl(p: Path) -> list[dict[str, Any]]:
    out = []
    with p.open() as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


# ---------- De-anonymize judgments ----------

def deanon(rec: dict[str, Any]) -> dict[str, dict[str, int]]:
    """Map A/B back to vanilla/with_omc."""
    ordering = rec["ordering"]
    scores = rec["scores"]
    return {
        ordering["A"]: scores["A"],
        ordering["B"]: scores["B"],
    }


def deanon_winner(rec: dict[str, Any]) -> str:
    """Return 'vanilla', 'with_omc', or 'tie'."""
    w = rec["winner"]
    if w == "tie":
        return "tie"
    return rec["ordering"][w]


# ---------- Analysis per repo ----------

def analyze_repo(repo: str, scores: list[dict[str, Any]], pairs_by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    repo_scores = [s for s in scores if s["repo"] == repo]
    n = len(repo_scores)
    out: dict[str, Any] = {"repo": repo, "n": n, "dimensions": {}, "per_skill": {}, "head_to_head": {}, "cost_latency": {}}
    if n == 0:
        return out

    # Per-dimension paired stats
    per_dim_diffs: dict[str, list[float]] = {d: [] for d in DIMENSIONS}
    per_dim_v: dict[str, list[float]] = {d: [] for d in DIMENSIONS}
    per_dim_o: dict[str, list[float]] = {d: [] for d in DIMENSIONS}
    summed_diffs: list[float] = []
    summed_v: list[float] = []
    summed_o: list[float] = []
    per_skill_diffs: dict[str, dict[str, list[float]]] = defaultdict(lambda: {d: [] for d in DIMENSIONS})
    per_skill_n: dict[str, int] = defaultdict(int)
    h2h: dict[str, int] = {"with_omc": 0, "vanilla": 0, "tie": 0}

    for rec in repo_scores:
        d = deanon(rec)
        v = d["vanilla"]
        o = d["with_omc"]
        s_v = 0
        s_o = 0
        for dim in DIMENSIONS:
            per_dim_v[dim].append(float(v[dim]))
            per_dim_o[dim].append(float(o[dim]))
            per_dim_diffs[dim].append(float(o[dim]) - float(v[dim]))
            per_skill_diffs[rec["skill"]][dim].append(float(o[dim]) - float(v[dim]))
            s_v += int(v[dim])
            s_o += int(o[dim])
        summed_v.append(float(s_v))
        summed_o.append(float(s_o))
        summed_diffs.append(float(s_o - s_v))
        per_skill_n[rec["skill"]] += 1
        h2h[deanon_winner(rec)] += 1

    for dim in DIMENSIONS:
        diffs = per_dim_diffs[dim]
        W, p, k = wilcoxon_signed_rank(diffs)
        lo, hi = bootstrap_ci(diffs)
        out["dimensions"][dim] = {
            "mean_vanilla": safe_mean(per_dim_v[dim]),
            "mean_with_omc": safe_mean(per_dim_o[dim]),
            "mean_delta": safe_mean(diffs),
            "ci95_low": lo,
            "ci95_high": hi,
            "wilcoxon_W": W,
            "wilcoxon_p": p,
            "n_nonzero": k,
        }

    # Summed dimensions (overall)
    W, p, k = wilcoxon_signed_rank(summed_diffs)
    lo, hi = bootstrap_ci(summed_diffs)
    win_rate = sum(1 for d in summed_diffs if d > 0) / max(1, len(summed_diffs))
    out["summed"] = {
        "mean_vanilla": safe_mean(summed_v),
        "mean_with_omc": safe_mean(summed_o),
        "mean_delta": safe_mean(summed_diffs),
        "ci95_low": lo,
        "ci95_high": hi,
        "wilcoxon_W": W,
        "wilcoxon_p": p,
        "n_nonzero": k,
        "with_omc_strict_win_rate": win_rate,
    }
    out["head_to_head"] = h2h

    # Per-skill breakdown
    for skill, dim_map in per_skill_diffs.items():
        rec_out = {"n": per_skill_n[skill]}
        for dim in DIMENSIONS:
            vals = dim_map[dim]
            rec_out[dim] = {"mean_delta": safe_mean(vals), "n": len(vals)}
        out["per_skill"][skill] = rec_out

    # Cost & latency per arm
    cost_lat = compute_cost_latency(repo, pairs_by_id, [s["task_id"] for s in repo_scores])
    out["cost_latency"] = cost_lat
    return out


def compute_cost_latency(
    repo: str,
    pairs_by_id: dict[str, dict[str, Any]],
    task_ids: list[str],
) -> dict[str, Any]:
    arms = {"vanilla": defaultdict(list), "with_omc": defaultdict(list)}
    for tid in task_ids:
        key = (repo, tid)
        pair = pairs_by_id.get(key)
        if pair is None:
            continue
        for arm in ("vanilla", "with_omc"):
            payload = pair[arm]
            if payload.get("cost_usd") is not None:
                arms[arm]["cost_usd"].append(float(payload["cost_usd"]))
            if payload.get("wallclock_ms") is not None:
                arms[arm]["wallclock_ms"].append(float(payload["wallclock_ms"]))
            tokens = payload.get("tokens") or {}
            t_in = tokens.get("input", tokens.get("in", 0)) or 0
            t_out = tokens.get("output", tokens.get("out", 0)) or 0
            arms[arm]["tokens_in"].append(float(t_in))
            arms[arm]["tokens_out"].append(float(t_out))
    out = {}
    for arm, m in arms.items():
        out[arm] = {k: safe_mean(v) for k, v in m.items()}
    return out


# ---------- Report rendering ----------

def fmt_pct(x: float) -> str:
    return f"{100 * x:.1f}%"


def fmt_p(p: float) -> str:
    if p < 0.001:
        return "<0.001"
    return f"{p:.3f}"


def render_repo_section(name: str, a: dict[str, Any]) -> str:
    if a["n"] == 0:
        return f"## {name} results\n\n_No paired data._\n"
    lines = [f"## {name} results (n={a['n']} paired)\n"]
    lines.append("### Per-dimension (with_omc - vanilla)\n")
    lines.append("| dimension | mean(vanilla) | mean(with_omc) | mean delta | 95% CI | Wilcoxon p | n nonzero |")
    lines.append("|---|---|---|---|---|---|---|")
    for dim in DIMENSIONS:
        d = a["dimensions"][dim]
        lines.append(
            f"| {dim} | {d['mean_vanilla']:.2f} | {d['mean_with_omc']:.2f} | "
            f"{d['mean_delta']:+.2f} | [{d['ci95_low']:+.2f}, {d['ci95_high']:+.2f}] | "
            f"{fmt_p(d['wilcoxon_p'])} | {d['n_nonzero']} |"
        )
    s = a["summed"]
    lines.append("")
    lines.append("### Summed-dimension (overall)")
    lines.append(
        f"- mean vanilla = {s['mean_vanilla']:.2f}, mean with_omc = {s['mean_with_omc']:.2f}, "
        f"delta = {s['mean_delta']:+.2f} (95% CI [{s['ci95_low']:+.2f}, {s['ci95_high']:+.2f}])"
    )
    lines.append(f"- Wilcoxon p = {fmt_p(s['wilcoxon_p'])} (n nonzero = {s['n_nonzero']})")
    lines.append(f"- with_omc strict win rate (summed) = {fmt_pct(s['with_omc_strict_win_rate'])}")

    h = a["head_to_head"]
    total_h = sum(h.values())
    lines.append("")
    lines.append("### Head-to-head (judge's forced choice)")
    lines.append(
        f"- with_omc wins: {h['with_omc']} ({fmt_pct(h['with_omc'] / max(1, total_h))})  |  "
        f"vanilla wins: {h['vanilla']} ({fmt_pct(h['vanilla'] / max(1, total_h))})  |  "
        f"tie: {h['tie']} ({fmt_pct(h['tie'] / max(1, total_h))})"
    )

    lines.append("")
    lines.append("### Per-skill mean delta (with_omc - vanilla)")
    lines.append("| skill | n | correctness | structure | scope_honesty | calibration |")
    lines.append("|---|---|---|---|---|---|")
    for skill in sorted(a["per_skill"].keys()):
        ps = a["per_skill"][skill]
        lines.append(
            f"| {skill} | {ps['n']} | "
            f"{ps['correctness']['mean_delta']:+.2f} | {ps['structure']['mean_delta']:+.2f} | "
            f"{ps['scope_honesty']['mean_delta']:+.2f} | {ps['calibration']['mean_delta']:+.2f} |"
        )

    cl = a["cost_latency"]
    lines.append("")
    lines.append("### Cost & latency (per arm, mean)")
    lines.append("| arm | tokens_in | tokens_out | cost_usd | wallclock_ms |")
    lines.append("|---|---|---|---|---|")
    for arm in ("vanilla", "with_omc"):
        m = cl[arm]
        lines.append(
            f"| {arm} | {m.get('tokens_in', float('nan')):.0f} | {m.get('tokens_out', float('nan')):.0f} | "
            f"{m.get('cost_usd', float('nan')):.4f} | {m.get('wallclock_ms', float('nan')):.0f} |"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", required=True, type=Path)
    ap.add_argument("--scores", required=True, type=Path)
    ap.add_argument("--analysis-out", required=True, type=Path)
    ap.add_argument("--report-out", required=True, type=Path)
    args = ap.parse_args()

    pairs = load_jsonl(args.pairs)
    scores = load_jsonl(args.scores)
    pairs_by_id = {(p["repo"], p["task_id"]): p for p in pairs}

    cursor = analyze_repo("cursor", scores, pairs_by_id)
    copilot = analyze_repo("copilot", scores, pairs_by_id)

    analysis = {"cursor": cursor, "copilot": copilot, "n_total_judgments": len(scores)}
    args.analysis_out.parent.mkdir(parents=True, exist_ok=True)
    args.analysis_out.write_text(json.dumps(analysis, indent=2))
    print(f"Wrote {args.analysis_out}", file=sys.stderr)

    # Build markdown report
    md: list[str] = []
    md.append("# A1-full benchmark analysis\n")
    md.append(f"Total judgments scored: {len(scores)}\n")
    md.append(render_repo_section("Cursor", cursor))
    md.append(render_repo_section("Copilot (partial — quota caveat)", copilot))

    md.append("## Threats to validity\n")
    md.append("- Single-judge model (Claude Haiku 4.5) — judge biases not cross-validated.")
    md.append("- LLM judge sees anonymized A/B but is still an LLM, not a human rater.")
    md.append("- Copilot with-omc data is partial (n≈26) due to Copilot Pro quota exhaustion (HTTP 402) starting at task a1-027. Treat 34 missing pairs as MISSING DATA, not 'OMC made copilot worse'.")
    md.append("- Single run per arm — no replication across reruns.")
    md.append("- Tasks were drafted from a known fixture; no held-out / unseen tasks.")
    md.append("- The judge prompt template is fixed; sensitivity to prompt wording not measured.\n")

    md.append("## What we did and didn't measure\n")
    md.append("- DID measure: paired text-quality differences across 4 rubric dimensions on 60 cursor pairs and 26 copilot pairs.")
    md.append("- DID measure: per-arm cost and wallclock latency.")
    md.append("- DID NOT measure: end-to-end task completion in real codebases, multi-turn conversations, agent-tool interactions, real user satisfaction, retention or downstream productivity.")
    md.append("- DID NOT measure: the full copilot with-omc population — only the 26 tasks before quota exhaustion.\n")

    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    args.report_out.write_text("\n".join(md) + "\n")
    print(f"Wrote {args.report_out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
