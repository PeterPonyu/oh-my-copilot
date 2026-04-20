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


@dataclass
class CheckResult:
    name: str
    command: str
    success: bool
    duration_sec: float
    output_tail: str


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
    tail = (proc.stdout + proc.stderr).strip().splitlines()[-12:]
    return CheckResult(
        name="",
        command=cmd,
        success=proc.returncode == 0,
        duration_sec=round(duration, 2),
        output_tail="\n".join(tail),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["quick", "full"], default="quick")
    parser.add_argument("--root", default=".")
    parser.add_argument("--output-dir", default="benchmark/results")
    parser.add_argument("--run-agent-smoke", action="store_true")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    outdir = (root / args.output_dir).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    env = os.environ.copy()
    if args.run_agent_smoke:
      env["RUN_COPILOT_AGENT_SMOKE"] = "1"

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

    results_json = outdir / f"{args.profile}_results.json"
    results_json.write_text(json.dumps([asdict(r) for r in results], indent=2) + "\n")

    md_lines = [
        f"# Benchmark Results ({args.profile})",
        "",
        f"Root: `{root}`",
        "",
        "| Check | Result | Duration (s) |",
        "| --- | --- | ---: |",
    ]
    for r in results:
        md_lines.append(f"| `{r.name}` | {'PASS' if r.success else 'FAIL'} | {r.duration_sec} |")
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

    return 0 if all(r.success for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
