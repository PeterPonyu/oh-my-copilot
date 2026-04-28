from __future__ import annotations

import json
import tempfile
import unittest
from types import SimpleNamespace
from unittest import mock

from benchmark.runs import host_client
from benchmark.runs import run_a1_full
from benchmark.runs.pilot import run_a1_pilot
from benchmark.runs.recorder import Recorder


class CopilotOAuthModeTests(unittest.TestCase):
    def test_build_copilot_command_forwards_free_oauth_model(self) -> None:
        cmd = host_client.build_copilot_command("/bin/copilot", "hello", model="gpt-5-mini")

        self.assertEqual(
            cmd,
            [
                "/bin/copilot",
                "-p",
                "hello",
                "--output-format",
                "json",
                "--allow-all-tools",
                "--model",
                "gpt-5-mini",
            ],
        )

    def test_call_copilot_rejects_local_or_byok_provider_env(self) -> None:
        with self.assertRaisesRegex(host_client.CopilotError, "custom provider/BYOK"):
            host_client.ensure_oauth_backend({"COPILOT_PROVIDER_BASE_URL": "http://127.0.0.1:11434/v1"})

    def test_call_copilot_records_oauth_backend_and_model_arg(self) -> None:
        events = [
            {"type": "assistant.message", "data": {"content": "ok"}},
            {
                "type": "result",
                "usage": {
                    "premiumRequests": 0,
                    "sessionDurationMs": 10,
                    "totalApiDurationMs": 5,
                },
            },
        ]
        stdout = "\n".join(json.dumps(event) for event in events) + "\n"

        with tempfile.TemporaryDirectory() as tmpdir:
            with mock.patch.object(host_client, "ensure_oauth_backend") as ensure, mock.patch.object(
                host_client.shutil, "which", return_value="/bin/copilot"
            ), mock.patch.object(
                host_client.subprocess,
                "run",
                return_value=SimpleNamespace(stdout=stdout, stderr="", returncode=0),
            ) as run:
                out = host_client.call_copilot("hello", workdir=tmpdir, model="gpt-5-mini", timeout=12)

        ensure.assert_called_once_with()
        cmd = run.call_args.args[0]
        self.assertIn("--model", cmd)
        self.assertEqual(cmd[cmd.index("--model") + 1], "gpt-5-mini")
        self.assertEqual(out["request_body"]["auth_backend"], "github_copilot_oauth")
        self.assertEqual(out["request_body"]["model_arg"], "gpt-5-mini")
        self.assertEqual(out["premium_requests"], 0)

    def test_pilot_cli_defaults_to_confirmed_free_model_and_both_arms(self) -> None:
        args = run_a1_pilot.parse_args([])

        self.assertEqual(args.model, "gpt-5-mini")
        self.assertEqual(args.arm, "both")
        self.assertEqual(run_a1_pilot._recorder_model(args.model), "github/copilot-cli/gpt-5-mini")
        self.assertEqual(run_a1_pilot._selected_arms(args.arm), ("vanilla", "with-omc"))

    def test_full_cli_supports_limit_and_single_arm(self) -> None:
        args = run_a1_full.parse_args(["--model", "gpt-5-mini", "--limit", "1", "--arm", "vanilla"])

        self.assertEqual(args.model, "gpt-5-mini")
        self.assertEqual(args.limit, 1)
        self.assertEqual(run_a1_full._selected_arms(args.arm), ("vanilla",))
        self.assertEqual(run_a1_full._limited_tasks([{"id": "a"}, {"id": "b"}], 1), [{"id": "a"}])

    def test_recorder_prices_copilot_model_suffix_as_host_product(self) -> None:
        rec = Recorder("unit", "vanilla", "github/copilot-cli/gpt-5-mini", budget_usd=1.0)
        try:
            rec.task_start("t1", "prompt")
            rec.request("t1", {"messages": [{"role": "user", "content": "prompt"}]})
            rec.response(
                "t1",
                {"events": [{"type": "assistant.message", "data": {"content": "ok"}}]},
                {"premium_requests": 0, "in": 0, "out": 0},
            )
            rec.task_end("t1")
            rec.run_end()
            manifest = json.loads((rec.run_dir / "manifest.json").read_text())
            self.assertTrue(manifest["pricing_known"])
            self.assertEqual(manifest["running_total_usd"], 0.0)
        finally:
            import shutil

            shutil.rmtree(rec.run_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
