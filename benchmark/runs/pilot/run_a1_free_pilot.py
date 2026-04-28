"""A1 pilot through local/free Ollama models (no Copilot CLI calls)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

from benchmark.runs.free_runner import run_benchmark  # noqa: E402

TASKS_PATH = Path(__file__).parent / "a1_tasks.json"


if __name__ == "__main__":
    raise SystemExit(run_benchmark(benchmark="A1-free", tasks_path=TASKS_PATH, default_timeout=180.0))
