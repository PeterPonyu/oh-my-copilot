from __future__ import annotations

import io
import json
import unittest
from unittest.mock import patch

from benchmark.runs.ollama_client import call_ollama_chat, choose_model, list_models
from benchmark.runs.recorder import Recorder


class _Response(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def _urlopen_json(payload):
    return _Response(json.dumps(payload).encode("utf-8"))


class OllamaClientTests(unittest.TestCase):
    @patch("urllib.request.urlopen")
    def test_list_and_choose_model(self, urlopen):
        payload = {"models": [{"name": "qwen2.5:3b"}]}
        urlopen.side_effect = [_urlopen_json(payload), _urlopen_json(payload)]
        self.assertEqual(list_models(), ["qwen2.5:3b"])
        self.assertEqual(choose_model(), "qwen2.5:3b")

    @patch("urllib.request.urlopen")
    def test_call_ollama_chat_normalizes_response(self, urlopen):
        urlopen.return_value = _urlopen_json(
            {
                "message": {"role": "assistant", "content": "hello"},
                "prompt_eval_count": 12,
                "eval_count": 5,
                "total_duration": 7_000_000,
                "done_reason": "stop",
            }
        )
        result = call_ollama_chat([{"role": "user", "content": "hi"}], "ollama/qwen2.5:3b")
        self.assertEqual(result["content"], "hello")
        self.assertEqual(result["tokens"]["input"], 12)
        self.assertEqual(result["tokens"]["output"], 5)
        self.assertEqual(result["premium_requests"], 0)
        self.assertEqual(result["api_duration_ms"], 7)
        self.assertEqual(result["request_body"]["model"], "qwen2.5:3b")

    def test_recorder_treats_any_ollama_tag_as_known_zero_cost(self):
        rec = Recorder("unit", "vanilla", "ollama/qwen2.5:7b-instruct-q8_0", budget_usd=0)
        try:
            rec.task_start("t1", "prompt")
            rec.request("t1", {"messages": [{"role": "user", "content": "prompt"}]})
            rec.response("t1", {"message": {"content": "ok"}}, {"in": 1000, "out": 2000})
            rec.task_end("t1")
            rec.run_end()
            manifest = json.loads((rec.run_dir / "manifest.json").read_text())
            self.assertTrue(manifest["pricing_known"])
            self.assertEqual(manifest["running_total_usd"], 0.0)
        finally:
            # Leave normal benchmark data intact; this unit run is safe to remove.
            import shutil

            shutil.rmtree(rec.run_dir, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
