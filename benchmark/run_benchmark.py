#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from pathlib import Path


EVIDENCE_MARKERS = (
    "ROOT_AGENT_OK",
    "PLUGIN_AGENT_OK",
    "INSTALL_STATE: ok",
    "source=example-workspace",
    "source=plugin",
    "REFINEMENT_MAP_OK",
    "PLUGIN_BOUNDARY_OK",
)


def looks_like_repo_root(path: Path) -> bool:
    return (
        (path / "AGENTS.md").is_file()
        and (path / "packages" / "copilot-cli-plugin" / "plugin.json").is_file()
        and (path / "benchmark").is_dir()
    )


def collapse_omx_team_worktree(path: Path) -> Path | None:
    parts = path.resolve().parts
    for index, part in enumerate(parts):
        if part != ".omx":
            continue
        if index + 3 >= len(parts):
            continue
        if parts[index + 1] != "team":
            continue
        if "worktrees" not in parts[index + 2 :]:
            continue
        candidate = Path(*parts[:index]) if index > 0 else Path(parts[0])
        if looks_like_repo_root(candidate):
            return candidate
    return None


def git_toplevel(path: Path) -> Path | None:
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=str(path),
            text=True,
            capture_output=True,
            check=True,
        )
    except Exception:
        return None
    value = proc.stdout.strip()
    return Path(value).resolve() if value else None


def resolve_canonical_root(path: Path) -> Path:
    candidate = path.resolve()
    collapsed = collapse_omx_team_worktree(candidate)
    if collapsed is not None:
        return collapsed

    current = candidate if candidate.is_dir() else candidate.parent
    for probe in [current, *current.parents]:
        if looks_like_repo_root(probe):
            return probe

    git_root = git_toplevel(current)
    return git_root if git_root is not None else current


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
    investigation_required: bool
    improvement_summary: str
    dimensions: list[EvaluationDimension]


@dataclass
class HistoryEntry:
    timestamp: str
    repo: str
    git_branch: str
    git_sha: str
    profile: str
    variant: str
    score: int
    max_score: int
    threshold_score: int
    passed: bool
    release_blocking: bool
    output_dir: str


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


def git_value(root: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", *args],
        cwd=str(root),
        text=True,
        capture_output=True,
        check=True,
    )
    return proc.stdout.strip()


def load_history_entries(history_path: Path) -> list[dict[str, object]]:
    if not history_path.exists():
        return []
    return [json.loads(line) for line in history_path.read_text(encoding="utf-8").splitlines() if line.strip()]


def history_identity(item: dict[str, object]) -> tuple[object, ...]:
    return (
        item["repo"],
        item["git_branch"],
        item["git_sha"],
        item["profile"],
        item["variant"],
        item["score"],
        item["max_score"],
        item["threshold_score"],
        item["passed"],
        item["release_blocking"],
        item["output_dir"],
    )


def collapse_history_entries(entries: list[dict[str, object]]) -> list[dict[str, object]]:
    latest_by_identity: dict[tuple[object, ...], dict[str, object]] = {}
    for item in sorted(entries, key=lambda candidate: candidate["timestamp"]):
        latest_by_identity[history_identity(item)] = item
    return sorted(latest_by_identity.values(), key=lambda item: item["timestamp"], reverse=True)


def render_history_markdown(entries: list[dict[str, object]]) -> str:
    md_lines = [
        "# Benchmark History",
        "",
        "| Timestamp | Branch | SHA | Profile | Variant | Score | Threshold | Gate | Output |",
        "| --- | --- | --- | --- | --- | ---: | ---: | --- | --- |",
    ]
    for item in entries:
        md_lines.append(
            f"| `{item['timestamp']}` | `{item['git_branch']}` | `{item['git_sha']}` | "
            f"`{item['profile']}` | `{item['variant']}` | {item['score']}/{item['max_score']} | "
            f"{item['threshold_score']}/{item['max_score']} | "
            f"{'PASS' if item['passed'] else 'FAIL'} | `{item['output_dir']}` |"
        )
    return "\n".join(md_lines) + "\n"


def record_history(root: Path, outdir: Path, evaluation: EvaluationContract) -> None:
    history_dir = (root / "benchmark" / "results").resolve()
    history_dir.mkdir(parents=True, exist_ok=True)
    history_path = history_dir / "history.jsonl"
    history_md = history_dir / "history.md"

    entry = HistoryEntry(
        timestamp=datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        repo=root.name,
        git_branch=git_value(root, "branch", "--show-current"),
        git_sha=git_value(root, "rev-parse", "--short", "HEAD"),
        profile=evaluation.profile,
        variant=evaluation.variant,
        score=evaluation.score,
        max_score=evaluation.max_score,
        threshold_score=evaluation.threshold_score,
        passed=evaluation.passed,
        release_blocking=evaluation.release_blocking,
        output_dir=os.path.relpath(outdir, root),
    )

    entries = collapse_history_entries([*load_history_entries(history_path), asdict(entry)])
    history_path.write_text(
        "".join(json.dumps(item, ensure_ascii=False) + "\n" for item in entries),
        encoding="utf-8",
    )
    history_md.write_text(render_history_markdown(entries), encoding="utf-8")


def summarize_improvement(
    variant: str,
    actual_delta_vs_vanilla: int,
) -> tuple[bool, str]:
    if variant != "enhanced":
        return (
            False,
            "Vanilla reference run establishes the comparison floor; use an enhanced run to measure prompt-smoke uplift.",
        )
    if actual_delta_vs_vanilla > 0:
        return (
            False,
            f"Enhanced evidence improved by {actual_delta_vs_vanilla} over the vanilla floor; benchmark-backed uplift observed.",
        )
    if actual_delta_vs_vanilla == 0:
        return (
            True,
            "Enhanced evidence did not improve over the vanilla floor; investigate missing prompt-smoke markers before treating the refinement as effective.",
        )
    return (
        True,
        f"Enhanced evidence regressed by {-actual_delta_vs_vanilla} below the vanilla floor; investigate failing checks or markers before treating the refinement as effective.",
    )


def build_evaluation(
    profile: str,
    variant: str,
    results: list[CheckResult],
) -> EvaluationContract:
    results_by_name = {result.name: result for result in results}
    smoke_result = results_by_name.get("smoke_cli")
    smoke_evidence = smoke_result.output_tail if smoke_result else "(smoke_cli result missing)"
    smoke_markers = set(smoke_result.markers if smoke_result else [])
    all_markers = {marker for result in results for marker in result.markers}

    if profile == "quick":
        weight_map = {
            "docs_validation": ("check", "docs validation stays green", 15),
            "power_validation": ("check", "power surface validation stays green", 15),
            "root_validation": ("check", "root surface validation stays green", 15),
            "REFINEMENT_MAP_OK": ("marker", "README exposes the refinement-priority map", 10),
            "PLUGIN_BOUNDARY_OK": ("marker", "README exposes the plugin-boundary review", 10),
            "smoke_cli": ("check", "basic Copilot CLI smoke passes", 15),
            "ROOT_AGENT_OK": ("marker", "root reviewer prompt smoke returns ROOT_AGENT_OK", 20),
            "PLUGIN_AGENT_OK": ("marker", "namespaced plugin reviewer prompt smoke returns PLUGIN_AGENT_OK", 20),
        }
        required_names = (
            "docs_validation",
            "power_validation",
            "root_validation",
            "REFINEMENT_MAP_OK",
            "PLUGIN_BOUNDARY_OK",
            "smoke_cli",
        )
    else:
        weight_map = {
            "docs_validation": ("check", "docs validation stays green", 10),
            "power_validation": ("check", "power surface validation stays green", 10),
            "root_validation": ("check", "root surface validation stays green", 10),
            "REFINEMENT_MAP_OK": ("marker", "README exposes the refinement-priority map", 5),
            "PLUGIN_BOUNDARY_OK": ("marker", "README exposes the plugin-boundary review", 5),
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
            "REFINEMENT_MAP_OK",
            "PLUGIN_BOUNDARY_OK",
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
            passed = name in all_markers
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
    investigation_required, improvement_summary = summarize_improvement(
        variant=variant,
        actual_delta_vs_vanilla=actual_delta_vs_vanilla,
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
        investigation_required=investigation_required,
        improvement_summary=improvement_summary,
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

    invocation_root = Path(args.root).resolve()
    root = resolve_canonical_root(invocation_root)
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
        f"Invocation root: `{invocation_root}`",
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
            f"- Improvement summary: {evaluation.improvement_summary}",
            f"- Investigation required: {'yes' if evaluation.investigation_required else 'no'}",
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
                f"- Improvement summary: {evaluation.improvement_summary}",
                f"- Investigation required: **{'yes' if evaluation.investigation_required else 'no'}**",
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

    record_history(root, outdir, evaluation)

    return 0 if all(r.success for r in results) and evaluation.passed else 1


if __name__ == "__main__":
    sys.exit(main())
