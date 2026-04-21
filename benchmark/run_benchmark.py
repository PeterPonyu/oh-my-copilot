#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, asdict
from pathlib import Path


EVIDENCE_MARKERS = (
    "ROOT_AGENT_OK",
    "PLUGIN_AGENT_OK",
    "INSTALL_STATE: ok",
    "source=example-workspace",
    "source=plugin",
)


@dataclass
class CheckResult:
    name: str
    command: str
    success: bool
    duration_sec: float
    output_tail: str
    markers: list[str]


@dataclass
class EvaluationDimension:
    name: str
    kind: str
    description: str
    weight: int
    required: bool
    passed: bool
    evidence: str


@dataclass
class EvaluationContract:
    profile: str
    variant: str
    score: int
    max_score: int
    threshold_score: int
    passed: bool
    release_blocking: bool
    expected_vanilla_score: int
    required_delta_vs_vanilla: int
    actual_delta_vs_vanilla: int
    dimensions: list[EvaluationDimension]


def run(cmd: str, cwd: Path, env: dict[str, str]) -> CheckResult:
    start = time.time()
    proc = subprocess.run(
        cmd,
        cwd=str(cwd),
        shell=True,
        text=True,
        capture_output=True,
        env=env,
    )
    duration = time.time() - start
    combined_output = (proc.stdout + proc.stderr).strip()
    tail = combined_output.splitlines()[-12:]
    return CheckResult(
        name="",
        command=cmd,
        success=proc.returncode == 0,
        duration_sec=round(duration, 2),
        output_tail="\n".join(tail),
        markers=[marker for marker in EVIDENCE_MARKERS if marker in combined_output],
    )


def determine_variant(run_agent_smoke: bool, variant_arg: str) -> str:
    if variant_arg == "auto":
        return "enhanced" if run_agent_smoke else "vanilla"
    return variant_arg


def build_evaluation(
    profile: str,
    variant: str,
    results: list[CheckResult],
) -> EvaluationContract:
    results_by_name = {result.name: result for result in results}
    smoke_result = results_by_name.get("smoke_cli")
    smoke_evidence = smoke_result.output_tail if smoke_result else "(smoke_cli result missing)"
    smoke_markers = set(smoke_result.markers if smoke_result else [])

    if profile == "quick":
        weight_map = {
            "docs_validation": ("check", "docs validation stays green", 15),
            "power_validation": ("check", "power surface validation stays green", 15),
            "root_validation": ("check", "root surface validation stays green", 15),
            "smoke_cli": ("check", "basic Copilot CLI smoke passes", 15),
            "ROOT_AGENT_OK": ("marker", "root reviewer prompt smoke returns ROOT_AGENT_OK", 20),
            "PLUGIN_AGENT_OK": ("marker", "namespaced plugin reviewer prompt smoke returns PLUGIN_AGENT_OK", 20),
        }
        required_names = (
            "docs_validation",
            "power_validation",
            "root_validation",
            "smoke_cli",
        )
    else:
        weight_map = {
            "docs_validation": ("check", "docs validation stays green", 10),
            "power_validation": ("check", "power surface validation stays green", 10),
            "root_validation": ("check", "root surface validation stays green", 10),
            "smoke_cli": ("check", "basic Copilot CLI smoke passes", 10),
            "bootstrap": ("check", "bootstrap flow still succeeds", 10),
            "install_state": ("marker", "install-state proof returns INSTALL_STATE: ok", 10),
            "standalone_hook_proof": ("marker", "standalone hook proof reports example/plugin sources", 10),
            "ROOT_AGENT_OK": ("marker", "root reviewer prompt smoke returns ROOT_AGENT_OK", 15),
            "PLUGIN_AGENT_OK": ("marker", "namespaced plugin reviewer prompt smoke returns PLUGIN_AGENT_OK", 15),
        }
        required_names = (
            "docs_validation",
            "power_validation",
            "root_validation",
            "smoke_cli",
            "bootstrap",
            "install_state",
            "standalone_hook_proof",
        )

    if variant == "enhanced":
        required_names = tuple(weight_map.keys())

    dimensions: list[EvaluationDimension] = []
    for name, (kind, description, weight) in weight_map.items():
        passed = False
        evidence = "(no evidence)"
        if kind == "check":
            result = results_by_name.get(name)
            passed = bool(result and result.success)
            evidence = result.output_tail if result else "(result missing)"
        elif name == "install_state":
            result = results_by_name.get("install_state")
            passed = bool(result and "INSTALL_STATE: ok" in result.output_tail)
            evidence = result.output_tail if result else "(result missing)"
        elif name == "standalone_hook_proof":
            result = results_by_name.get("standalone_hook_proof")
            required_markers = {"source=example-workspace", "source=plugin"}
            passed = bool(result and required_markers.issubset(set(result.markers)))
            evidence = result.output_tail if result else "(result missing)"
        else:
            passed = name in smoke_markers
            evidence = smoke_evidence

        dimensions.append(
            EvaluationDimension(
                name=name,
                kind=kind,
                description=description,
                weight=weight,
                required=name in required_names,
                passed=passed,
                evidence=evidence,
            )
        )

    score = sum(d.weight for d in dimensions if d.passed)
    max_score = sum(d.weight for d in dimensions)
    threshold_score = sum(d.weight for d in dimensions if d.required)
    expected_vanilla_score = sum(
        weight for name, (_, _, weight) in weight_map.items() if name not in {"ROOT_AGENT_OK", "PLUGIN_AGENT_OK"}
    )
    actual_delta_vs_vanilla = score - expected_vanilla_score
    required_delta_vs_vanilla = max_score - expected_vanilla_score
    passed = score >= threshold_score and all(
        dimension.passed for dimension in dimensions if dimension.required
    )

    return EvaluationContract(
        profile=profile,
        variant=variant,
        score=score,
        max_score=max_score,
        threshold_score=threshold_score,
        passed=passed,
        release_blocking=not passed,
        expected_vanilla_score=expected_vanilla_score,
        required_delta_vs_vanilla=required_delta_vs_vanilla,
        actual_delta_vs_vanilla=actual_delta_vs_vanilla,
        dimensions=dimensions,
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["quick", "full"], default="quick")
    parser.add_argument("--root", default=".")
    parser.add_argument("--output-dir", default="benchmark/results")
    parser.add_argument("--run-agent-smoke", action="store_true")
    parser.add_argument("--variant", choices=["auto", "vanilla", "enhanced"], default="auto")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    outdir = (root / args.output_dir).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    if args.run_agent_smoke:
        env["RUN_COPILOT_AGENT_SMOKE"] = "1"

    variant = determine_variant(args.run_agent_smoke, args.variant)

    checks: list[tuple[str, str]] = [
        ("docs_validation", "./scripts/validate-doc-links.sh"),
        ("power_validation", "./scripts/validate-power-surfaces.sh"),
        ("root_validation", "./scripts/validate-root-copilot-surfaces.sh"),
        ("smoke_cli", "./scripts/smoke-copilot-cli.sh"),
    ]

    if args.profile == "full":
        checks.extend(
            [
                ("bootstrap", "./scripts/bootstrap-copilot-power.sh"),
                ("install_state", "./scripts/check-install-state.sh"),
                ("standalone_hook_proof", "./scripts/prove-vscode-hook-standalone.sh"),
            ]
        )

    results: list[CheckResult] = []
    for name, cmd in checks:
        result = run(cmd, root, env)
        result.name = name
        print(("PASS" if result.success else "FAIL"), name)
        results.append(result)

    evaluation = build_evaluation(args.profile, variant, results)

    results_json = outdir / f"{args.profile}_results.json"
    results_json.write_text(json.dumps([asdict(r) for r in results], indent=2) + "\n")

    evaluation_json = outdir / f"{args.profile}_evaluation.json"
    evaluation_json.write_text(json.dumps(asdict(evaluation), indent=2) + "\n")

    md_lines = [
        f"# Benchmark Results ({args.profile})",
        "",
        f"Root: `{root}`",
        "",
        f"Variant: `{evaluation.variant}`",
        "",
        "| Check | Result | Duration (s) | Markers |",
        "| --- | --- | ---: | --- |",
    ]
    for r in results:
        markers = ", ".join(f"`{marker}`" for marker in r.markers) or "—"
        md_lines.append(f"| `{r.name}` | {'PASS' if r.success else 'FAIL'} | {r.duration_sec} | {markers} |")
    md_lines.extend(
        [
            "",
            "## Evaluation contract",
            "",
            "| Variant | Score | Threshold | Release gate | Vanilla floor | Required delta vs vanilla |",
            "| --- | ---: | ---: | --- | ---: | ---: |",
            (
                f"| `{evaluation.variant}` | {evaluation.score}/{evaluation.max_score} | "
                f"{evaluation.threshold_score}/{evaluation.max_score} | "
                f"{'PASS' if evaluation.passed else 'FAIL'} | "
                f"{evaluation.expected_vanilla_score}/{evaluation.max_score} | "
                f"{evaluation.required_delta_vs_vanilla} |"
            ),
            "",
            "| Dimension | Required | Passed | Weight |",
            "| --- | --- | --- | ---: |",
        ]
    )
    for dimension in evaluation.dimensions:
        md_lines.append(
            f"| `{dimension.name}` | {'yes' if dimension.required else 'no'} | "
            f"{'PASS' if dimension.passed else 'FAIL'} | {dimension.weight} |"
        )
    md_lines.append("")
    for r in results:
        md_lines.append(f"## {r.name}")
        md_lines.append("")
        md_lines.append("```text")
        md_lines.append(r.output_tail or "(no output)")
        md_lines.append("```")
        md_lines.append("")

    report_md = outdir / f"{args.profile}_report.md"
    report_md.write_text("\n".join(md_lines))

    evaluation_md = outdir / f"{args.profile}_evaluation.md"
    evaluation_md.write_text(
        "\n".join(
            [
                f"# Benchmark Evaluation ({args.profile}, {evaluation.variant})",
                "",
                f"- Score: **{evaluation.score}/{evaluation.max_score}**",
                f"- Threshold: **{evaluation.threshold_score}/{evaluation.max_score}**",
                f"- Release gate: **{'PASS' if evaluation.passed else 'FAIL'}**",
                f"- Vanilla floor: **{evaluation.expected_vanilla_score}/{evaluation.max_score}**",
                f"- Actual delta vs vanilla floor: **{evaluation.actual_delta_vs_vanilla}**",
                f"- Required delta vs vanilla floor: **{evaluation.required_delta_vs_vanilla}**",
                "",
                "| Dimension | Required | Passed | Weight | Description |",
                "| --- | --- | --- | ---: | --- |",
                *[
                    f"| `{dimension.name}` | {'yes' if dimension.required else 'no'} | "
                    f"{'PASS' if dimension.passed else 'FAIL'} | {dimension.weight} | "
                    f"{dimension.description} |"
                    for dimension in evaluation.dimensions
                ],
                "",
            ]
        )
    )

    return 0 if all(r.success for r in results) and evaluation.passed else 1


if __name__ == "__main__":
    sys.exit(main())
