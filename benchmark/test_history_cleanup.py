from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().with_name("run_benchmark.py")
SPEC = importlib.util.spec_from_file_location("copilot_run_benchmark", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class CopilotHistoryCleanupTests(unittest.TestCase):
    def test_collapse_history_entries_keeps_latest_equivalent_rerun(self) -> None:
        entries = [
            {
                "timestamp": "2026-04-21T14:42:05Z",
                "repo": "oh-my-copilot",
                "git_branch": "main",
                "git_sha": "c1d5e80",
                "profile": "quick",
                "variant": "enhanced",
                "score": 100,
                "max_score": 100,
                "threshold_score": 100,
                "passed": True,
                "release_blocking": False,
                "output_dir": "benchmark/results/current-quick-enhanced",
            },
            {
                "timestamp": "2026-04-21T14:42:23Z",
                "repo": "oh-my-copilot",
                "git_branch": "main",
                "git_sha": "c1d5e80",
                "profile": "quick",
                "variant": "enhanced",
                "score": 100,
                "max_score": 100,
                "threshold_score": 100,
                "passed": True,
                "release_blocking": False,
                "output_dir": "benchmark/results/current-quick-enhanced",
            },
            {
                "timestamp": "2026-04-21T14:43:09Z",
                "repo": "oh-my-copilot",
                "git_branch": "main",
                "git_sha": "c1d5e80",
                "profile": "full",
                "variant": "enhanced",
                "score": 100,
                "max_score": 100,
                "threshold_score": 100,
                "passed": True,
                "release_blocking": False,
                "output_dir": "benchmark/results/current-full-enhanced",
            },
        ]

        collapsed = MODULE.collapse_history_entries(entries)

        self.assertEqual(len(collapsed), 2)
        self.assertEqual(collapsed[0]["profile"], "full")
        self.assertEqual(collapsed[1]["timestamp"], "2026-04-21T14:42:23Z")

    def test_render_history_markdown_includes_only_latest_duplicate(self) -> None:
        entries = MODULE.collapse_history_entries(
            [
                {
                    "timestamp": "2026-04-21T14:46:15Z",
                    "repo": "oh-my-copilot",
                    "git_branch": "main",
                    "git_sha": "93f8f84",
                    "profile": "full",
                    "variant": "enhanced",
                    "score": 100,
                    "max_score": 100,
                    "threshold_score": 100,
                    "passed": True,
                    "release_blocking": False,
                    "output_dir": "benchmark/results/current-full-enhanced",
                },
                {
                    "timestamp": "2026-04-21T14:46:41Z",
                    "repo": "oh-my-copilot",
                    "git_branch": "main",
                    "git_sha": "93f8f84",
                    "profile": "full",
                    "variant": "enhanced",
                    "score": 100,
                    "max_score": 100,
                    "threshold_score": 100,
                    "passed": True,
                    "release_blocking": False,
                    "output_dir": "benchmark/results/current-full-enhanced",
                },
            ]
        )

        markdown = MODULE.render_history_markdown(entries)

        self.assertIn("# Benchmark History", markdown)
        self.assertIn("`2026-04-21T14:46:41Z`", markdown)
        self.assertNotIn("`2026-04-21T14:46:15Z`", markdown)


if __name__ == "__main__":
    unittest.main()
