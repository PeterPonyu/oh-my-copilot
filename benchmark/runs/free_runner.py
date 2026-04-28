"""Shared local/free Ollama A1 runner helpers for oh-my-copilot."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Any, Iterable

from benchmark.runs.ollama_client import DEFAULT_HOST, OllamaError, call_ollama_chat, choose_model
from benchmark.runs.recorder import Recorder

ROOT = Path(__file__).resolve().parents[2]
WITH_OMC_CWD = ROOT


def build_parser(*, benchmark: str, tasks_path: Path, default_timeout: float) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=f"Run {benchmark} through local/free Ollama models.")
    parser.add_argument("--model", help="Ollama model tag, with or without ollama/ prefix")
    parser.add_argument("--host", default=DEFAULT_HOST, help="Ollama host URL (default: %(default)s)")
    parser.add_argument("--timeout", type=float, default=default_timeout, help="Per-request timeout in seconds")
    parser.add_argument("--limit", type=int, help="Run only the first N tasks for bounded smoke tests")
    parser.add_argument("--arm", choices=("vanilla", "with-omc", "both"), default="both")
    parser.add_argument("--tasks", type=Path, default=tasks_path, help="Task fixture JSON path")
    return parser


def selected_tasks(tasks_path: Path, limit: int | None) -> list[dict[str, Any]]:
    tasks = json.loads(tasks_path.read_text(encoding="utf-8"))
    if not isinstance(tasks, list):
        raise ValueError(f"Task fixture must contain a list: {tasks_path}")
    if limit is not None:
        if limit < 1:
            raise ValueError("--limit must be >= 1")
        tasks = tasks[:limit]
    return tasks


def selected_arms(arm: str) -> list[str]:
    return ["vanilla", "with-omc"] if arm == "both" else [arm]


def _skill_guidance(skill_name: str) -> tuple[str | None, str | None]:
    path = ROOT / ".github" / "skills" / skill_name / "SKILL.md"
    if not path.exists():
        return None, None
    text = path.read_text(encoding="utf-8")
    max_chars = 5000
    if len(text) > max_chars:
        text = text[:max_chars].rstrip() + "\n\n[truncated for local benchmark prompt budget]"
    system = (
        "You are answering a benchmark prompt in oh-my-copilot's local/free "
        "Ollama sidecar path. This is with-local-skill-guidance evidence, not "
        "Copilot CLI auto-loading or host-product proof. Use the following "
        f"local skill guidance when relevant.\n\n--- {path.relative_to(ROOT)} ---\n{text}"
    )
    return system, str(path.relative_to(ROOT))


def messages_for_task(task: dict[str, Any], arm: str) -> tuple[list[dict[str, str]], dict[str, Any]]:
    user = str(task["prompt"])
    metadata: dict[str, Any] = {
        "skill": task.get("skill"),
        "arm": arm,
        "backend_label": "local-free-ollama",
    }
    if arm == "with-omc":
        system, skill_path = _skill_guidance(str(task.get("skill") or ""))
        metadata["guidance_mode"] = "with-local-skill-guidance"
        metadata["skill_guidance_path"] = skill_path
        if system:
            return [{"role": "system", "content": system}, {"role": "user", "content": user}], metadata
        metadata["guidance_missing"] = True
    return [{"role": "user", "content": user}], metadata


def run_arm(
    *,
    benchmark: str,
    arm: str,
    tasks: list[dict[str, Any]],
    model: str,
    host: str,
    timeout: float,
) -> Path:
    recorder_model = f"ollama/{model.removeprefix('ollama/')}"
    rec = Recorder(benchmark=benchmark, arm=arm, model=recorder_model, budget_usd=0.0, fallback_model=None)
    print(f"[arm={arm}] backend  -> local/free Ollama ({host})")
    print(f"[arm={arm}] model    -> {recorder_model}")
    print(f"[arm={arm}] run_dir  -> {rec.run_dir}")

    errors = 0
    for idx, task in enumerate(tasks, start=1):
        task_id = str(task["id"])
        messages, metadata = messages_for_task(task, arm)
        metadata.update({"host": host, "selected_model": recorder_model})
        rec.task_start(task_id, str(task["prompt"]), metadata=metadata)
        request_payload = {
            "backend": "ollama_chat",
            "model": recorder_model,
            "host": host,
            "messages": messages,
            "arm_semantics": metadata.get("guidance_mode", "plain-task-prompt"),
        }
        rec.request(task_id, request_payload)
        try:
            result = call_ollama_chat(messages=messages, model=model, host=host, timeout=timeout)
        except OllamaError as exc:
            print(f"[arm={arm}] task={task_id} OllamaError: {exc}", file=sys.stderr)
            rec.error(task_id, str(exc), kind="OllamaError")
            rec.task_end(task_id, status="error", error=str(exc))
            errors += 1
            continue
        tokens = {
            "in": result["tokens"]["input"],
            "out": result["tokens"]["output"],
            "cache_read": 0,
            "cache_write": 0,
            "premium_requests": 0,
        }
        rec.response(task_id, payload=result["raw"], tokens=tokens, wallclock_ms=result["wallclock_ms"])
        rec.task_end(task_id, status="ok")
        print(f"[arm={arm}] {idx}/{len(tasks)} task={task_id} ok wallclock_ms={result['wallclock_ms']}")

    rec.run_end(status="ok" if errors == 0 else "completed_with_errors")
    print(f"[arm={arm}] FINAL tasks={len(tasks)} errors={errors} cost=$0.000000")
    return rec.run_dir


def run_benchmark(*, benchmark: str, tasks_path: Path, default_timeout: float, argv: Iterable[str] | None = None) -> int:
    parser = build_parser(benchmark=benchmark, tasks_path=tasks_path, default_timeout=default_timeout)
    args = parser.parse_args(list(argv) if argv is not None else None)
    try:
        model = choose_model(args.model, host=args.host, timeout=min(args.timeout, 10.0))
        tasks = selected_tasks(args.tasks, args.limit)
    except (OllamaError, ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    print(f"Loaded {len(tasks)} tasks from {args.tasks}")
    print(f"Backend: local/free Ollama at {args.host}")
    print(f"Model: ollama/{model}")
    print("Cost guard: no Copilot CLI invocation; premium_requests=0; budget_usd=0")

    tempdirs: list[Path] = []
    out_dirs: list[Path] = []
    try:
        for arm in selected_arms(args.arm):
            if arm == "vanilla":
                vanilla_cwd = Path(tempfile.mkdtemp(prefix="ollama-vanilla-"))
                tempdirs.append(vanilla_cwd)
                print(f"[vanilla] tempdir -> {vanilla_cwd} (no .github/skills/)")
            out_dirs.append(
                run_arm(
                    benchmark=benchmark,
                    arm=arm,
                    tasks=tasks,
                    model=model,
                    host=args.host,
                    timeout=args.timeout,
                )
            )
    finally:
        for d in tempdirs:
            shutil.rmtree(d, ignore_errors=True)
            print(f"[cleanup] removed vanilla tempdir {d}")

    print("Run directories:")
    for d in out_dirs:
        print(f"  {d}")
    return 0
