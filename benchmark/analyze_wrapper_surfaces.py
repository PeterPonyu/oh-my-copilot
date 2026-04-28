#!/usr/bin/env python3
"""Render the benchmark wrapper-surface analysis for oh-my-copilot.

This analysis is intentionally separate from the release-gate scorecard. The
scorecard answers "did the checked-in contract pass?"; this report answers
"which wrapper surfaces are covered, what do the scores imply, and what should
be refined next?" Valid host evidence is restricted to the authenticated
Copilot CLI with ``--model gpt-5-mini``.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
OUT_JSON = ROOT / "benchmark" / "results" / "wrapper-surface-analysis-20260428.json"
OUT_MD = ROOT / "benchmark" / "results" / "wrapper-surface-analysis-20260428.md"
VALID_RUN_DIRS = (
    "20260428T081947Z__A1__vanilla__github_copilot-cli_gpt-5-mini__332abac2862d",
    "20260428T082119Z__A1__with-omc__github_copilot-cli_gpt-5-mini__8ab8bed4229c",
    "20260428T082223Z__A1-full__vanilla__github_copilot-cli_gpt-5-mini__e7482a3150d5",
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def score(path: str) -> dict[str, Any]:
    data = load_json(ROOT / path)
    return {key: data[key] for key in ("profile", "variant", "score", "max_score", "threshold_score", "passed")}


def run_record(name: str) -> dict[str, Any]:
    run_dir = ROOT / "benchmark" / "runs" / "data" / name
    manifest = run_dir / "manifest.json"
    if not manifest.exists():
        return {
            "run_dir": name,
            "status": "not-present-in-checkout",
            "model": "github/copilot-cli/gpt-5-mini",
            "complete_artifacts": False,
        }
    data = load_json(manifest)
    return {
        "run_dir": name,
        "status": data.get("status"),
        "benchmark": data.get("benchmark"),
        "arm": data.get("arm"),
        "model": data.get("current_model"),
        "tasks": data.get("n_tasks"),
        "responses": data.get("n_responses"),
        "errors": data.get("n_errors"),
        "premium_requests_total": data.get("premium_requests_total"),
        "wallclock_seconds": data.get("wallclock_seconds"),
        "complete_artifacts": all((run_dir / file_name).exists() for file_name in ("manifest.json", "events.jsonl", "summary.csv", "replay.txt")),
    }


def build_report() -> dict[str, Any]:
    quick_vanilla = score("benchmark/results/current-quick-vanilla/quick_evaluation.json")
    quick_enhanced = score("benchmark/results/current-quick-enhanced/quick_evaluation.json")
    full_vanilla = score("benchmark/results/current-full-vanilla/full_evaluation.json")
    full_enhanced = score("benchmark/results/current-full-enhanced/full_evaluation.json")
    return {
        "generated_at_utc": "2026-04-28T08:55:00Z",
        "repo": "oh-my-copilot",
        "valid_host_model": "copilot --model gpt-5-mini via authenticated local GitHub Copilot account",
        "invalid_evidence": "Ollama/local providers are not valid Copilot host-product verification",
        "score_summary": {
            "quick_vanilla": quick_vanilla,
            "quick_enhanced": quick_enhanced,
            "full_vanilla": full_vanilla,
            "full_enhanced": full_enhanced,
            "quick_enhanced_delta_vs_vanilla_floor": quick_enhanced["score"] - quick_vanilla["score"],
            "full_enhanced_delta_vs_vanilla_floor": full_enhanced["score"] - full_vanilla["score"],
        },
        "surface_matrix": [
            {
                "surface": "host_cli_model",
                "owner": "authenticated Copilot CLI",
                "proof": ["benchmark/runs/host_client.py", "benchmark/runs/test_copilot_oauth.py", "scripts/smoke-copilot-cli.sh"],
                "status": "covered",
                "refinement": "model-backed smoke defaults to gpt-5-mini, not auto or local providers",
            },
            {
                "surface": "root_agents_prompts_instructions",
                "owner": ".github/ root workspace",
                "proof": [".github/agents", ".github/prompts", ".github/instructions", "scripts/validate-root-copilot-surfaces.sh"],
                "status": "covered",
                "refinement": "keep prompt smoke tied to root reviewer/research/verifier routes",
            },
            {
                "surface": "skills",
                "owner": ".github/skills and packages/copilot-cli-plugin/skills",
                "proof": ["scripts/validate-power-surfaces.sh", "scripts/validate-root-copilot-surfaces.sh"],
                "status": "covered",
                "refinement": "score skills through discovery and task-command questions rather than raw file count",
            },
            {
                "surface": "hooks",
                "owner": ".github/hooks and .copilot-hooks",
                "proof": ["scripts/prove-vscode-hook-standalone.sh", "scripts/validate-root-copilot-surfaces.sh"],
                "status": "covered",
                "refinement": "full profile keeps standalone hook proof separate from model prompt proof",
            },
            {
                "surface": "plugin_package",
                "owner": "packages/copilot-cli-plugin",
                "proof": ["packages/copilot-cli-plugin/plugin.json", "scripts/check-install-state.sh", "scripts/validate-copilot-state-contract.sh"],
                "status": "covered",
                "refinement": "install-state proof must reject transient OMX/team worktree source paths",
            },
            {
                "surface": "run_artifacts",
                "owner": "benchmark/runs recorder/audit",
                "proof": ["benchmark/runs/audit_runs.py", "benchmark/runs/free-model-report-20260428.md"],
                "status": "covered",
                "refinement": "new gpt-5-mini run dirs supersede local/Ollama experiments",
            },
        ],
        "authenticated_run_evidence": [run_record(name) for name in VALID_RUN_DIRS],
        "refinement_decisions": [
            "Scores are saturated, so the next useful refinement is provenance hardening rather than raising existing thresholds blindly.",
            "Copilot model-backed smoke wrapper defaults to gpt-5-mini so future enhanced benchmark runs match the valid host-account evidence boundary.",
            "Keep stale/Ollama run dirs as non-authoritative archives only; reports and validators should point to OAuth-backed gpt-5-mini evidence.",
            "A full same-task gpt-5-mini paired comparison remains a future quality-scoring milestone, not a prerequisite for this bounded wrapper proof.",
        ],
    }


def render_markdown(report: dict[str, Any]) -> str:
    scores = report["score_summary"]
    rows = [
        ("quick", "vanilla", scores["quick_vanilla"]),
        ("quick", "enhanced", scores["quick_enhanced"]),
        ("full", "vanilla", scores["full_vanilla"]),
        ("full", "enhanced", scores["full_enhanced"]),
    ]
    lines = [
        "# Copilot wrapper-surface benchmark analysis — 2026-04-28",
        "",
        "Valid proof uses the authenticated GitHub Copilot CLI with `--model gpt-5-mini`. Ollama/local-provider runs are invalid for Copilot host-product claims.",
        "",
        "## Score analysis",
        "",
        "|profile|variant|score|threshold|gate|",
        "|---|---|---:|---:|---|",
    ]
    for profile, variant, data in rows:
        lines.append(f"|`{profile}`|`{variant}`|{data['score']}/{data['max_score']}|{data['threshold_score']}/{data['max_score']}|{'PASS' if data['passed'] else 'FAIL'}|")
    lines += [
        "",
        f"- Quick enhanced uplift over vanilla floor: **+{scores['quick_enhanced_delta_vs_vanilla_floor']}** points.",
        f"- Full enhanced uplift over vanilla floor: **+{scores['full_enhanced_delta_vs_vanilla_floor']}** points.",
        "- Because both enhanced profiles are saturated, refinement should add provenance/surface checks instead of inflating generic task-smoke scores.",
        "",
        "## Wrapper surface matrix",
        "",
        "|surface|status|proof|refinement|",
        "|---|---|---|---|",
    ]
    for row in report["surface_matrix"]:
        lines.append(f"|`{row['surface']}`|{row['status']}|{', '.join(row['proof'])}|{row['refinement']}|")
    lines += [
        "",
        "## Authenticated run evidence",
        "",
        "|run dir|status|model|tasks|premium|errors|artifacts|",
        "|---|---|---|---:|---:|---:|---|",
    ]
    for run in report["authenticated_run_evidence"]:
        lines.append(
            f"|`{run['run_dir']}`|{run.get('status')}|{run.get('model')}|{run.get('tasks', '')}|{run.get('premium_requests_total', '')}|{run.get('errors', '')}|{'complete' if run.get('complete_artifacts') else 'not checked in'}|"
        )
    lines += ["", "## Refinement decisions", ""]
    lines.extend(f"- {item}" for item in report["refinement_decisions"])
    return "\n".join(lines) + "\n"


def main() -> None:
    report = build_report()
    OUT_JSON.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    OUT_MD.write_text(render_markdown(report), encoding="utf-8")


if __name__ == "__main__":
    main()
