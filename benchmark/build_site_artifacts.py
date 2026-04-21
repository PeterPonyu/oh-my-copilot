#!/usr/bin/env python3
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESULTS_ROOT = ROOT / "benchmark" / "results"
SITE_ROOT = RESULTS_ROOT / "site"


def load_json(path: Path) -> object:
    return json.loads(path.read_text(encoding="utf-8"))


def summarize_evaluation(
    *,
    profile: str,
    variant: str,
    evaluation_path: Path,
    report_path: Path,
    results_path: Path,
) -> dict[str, object]:
    data = load_json(evaluation_path)
    dimensions = data.get("dimensions", [])
    required_dimensions = [
        dimension["name"]
        for dimension in dimensions
        if isinstance(dimension, dict) and dimension.get("required")
    ]
    passed_dimensions = [
        dimension["name"]
        for dimension in dimensions
        if isinstance(dimension, dict) and dimension.get("passed")
    ]

    return {
        "profile": profile,
        "variant": variant,
        "score": data.get("score"),
        "max_score": data.get("max_score"),
        "threshold_score": data.get("threshold_score"),
        "passed": data.get("passed"),
        "release_blocking": data.get("release_blocking"),
        "expected_vanilla_score": data.get("expected_vanilla_score"),
        "required_delta_vs_vanilla": data.get("required_delta_vs_vanilla"),
        "actual_delta_vs_vanilla": data.get("actual_delta_vs_vanilla"),
        "required_dimensions": required_dimensions,
        "passed_dimensions": passed_dimensions,
        "paths": {
            "evaluation": str(evaluation_path.relative_to(ROOT)),
            "report": str(report_path.relative_to(ROOT)),
            "results": str(results_path.relative_to(ROOT)),
        },
    }


def build_payload() -> dict[str, object]:
    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "repo": {
            "name": "oh-my-copilot",
            "host_surface": "GitHub Copilot CLI",
            "product_boundary": "Copilot CLI-first, docs/research-first",
            "path_style": "repository-relative",
        },
        "separation_contract": {
            "generated_evidence_file": "benchmark/results/site/oh-my-copilot.evidence.json",
            "curated_story_file": "benchmark/results/site/oh-my-copilot.story.json",
            "note": (
                "Generated proof indexes live here; presentation framing and editorial copy live in the curated story file."
            ),
        },
        "benchmark_evidence": {
            "quick_enhanced": summarize_evaluation(
                profile="quick",
                variant="enhanced",
                evaluation_path=RESULTS_ROOT / "current-quick-enhanced" / "quick_evaluation.json",
                report_path=RESULTS_ROOT / "current-quick-enhanced" / "quick_evaluation.md",
                results_path=RESULTS_ROOT / "current-quick-enhanced" / "quick_results.json",
            ),
            "full_enhanced": summarize_evaluation(
                profile="full",
                variant="enhanced",
                evaluation_path=RESULTS_ROOT / "current-full-enhanced" / "full_evaluation.json",
                report_path=RESULTS_ROOT / "current-full-enhanced" / "full_evaluation.md",
                results_path=RESULTS_ROOT / "current-full-enhanced" / "full_results.json",
            ),
        },
        "document_refs": {
            "state_contract_doc": {
                "path": "docs/state-contract.md",
                "focus": [
                    "Canonical plugin source path",
                    "User-global vs project-local state",
                    "Why this is benchmark-relevant",
                    "Local validation",
                ],
            },
            "benchmark_status_doc": {
                "path": "docs/benchmark-status.md",
                "focus": [
                    "Release-blocking evaluation contract",
                    "Evaluation contract (current policy)",
                    "State-management note",
                    "Remaining gaps",
                ],
            },
            "quick_start_doc": {
                "path": "docs/quick-start.md",
                "focus": [
                    "Run low-friction checks",
                    "Bootstrap when prerequisites are present",
                ],
            },
            "installation_doc": {
                "path": "docs/installation.md",
                "focus": [
                    "Prerequisites",
                    "Install path",
                    "Troubleshooting",
                ],
            },
            "references_doc": {
                "path": "docs/references.md",
                "focus": [
                    "GitHub Copilot CLI",
                    "Cursor current-state comparison inputs",
                ],
            },
            "known_limitations_doc": {
                "path": "docs/known-limitations.md",
                "focus": [
                    "Install limitations",
                    "Documentation limitations",
                    "Release limitations",
                ],
            },
            "comparison_matrix_doc": {
                "path": "docs/comparison-matrix.md",
                "focus": [
                    "State philosophy",
                    "Adjacent host note: Cursor",
                ],
            },
        },
    }


def main() -> None:
    SITE_ROOT.mkdir(parents=True, exist_ok=True)
    payload = build_payload()
    output_path = SITE_ROOT / "oh-my-copilot.evidence.json"
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(output_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
