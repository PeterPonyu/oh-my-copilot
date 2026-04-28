"""Append-only JSONL recorder for benchmark runs.

Each run gets its own subdirectory under ``data/`` containing:

  data/<UTC_TS>__<benchmark>__<arm>__<model_flat>__<run_id>/
    manifest.json          # config + final spend + status
    events.jsonl           # canonical append-only event log
    summary.csv            # one-line per-run summary
    replay.txt             # auto-generated human-readable transcript
    per-task/<task_id>/
      prompt.md            # raw prompt sent (system + user, delimited)
      response.md          # assistant reply, raw markdown
      metadata.json        # tokens, cost, wallclock, model, status
      request.json         # full request body for replay
      response_raw.json    # full response body

The recorder also enforces a hard USD budget cap and can flip to a
fallback (free) model on cap exhaustion.
"""

from __future__ import annotations

import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


# Per-million-token USD prices. Unknown models cost 0.
#
# Special case: ``github/copilot-cli`` is billed in **premium requests**, not
# tokens. We model it as ``premium_request_usd`` (a flat per-request rate).
# The estimate $0.04/request comes from Copilot Pro's $10/month allowance
# divided by ~250 included premium requests — a rough cost-tracking proxy.
PRICING: dict[str, dict[str, float]] = {
    "anthropic/claude-haiku-4-5-20251001": {"in": 1.0, "out": 5.0, "cache_read": 0.10, "cache_write": 1.25},
    "anthropic/claude-sonnet-4-6": {"in": 3.0, "out": 15.0, "cache_read": 0.30, "cache_write": 3.75},
    "anthropic/claude-opus-4-7": {"in": 15.0, "out": 75.0, "cache_read": 1.50, "cache_write": 18.75},
    "openai/gpt-4o-mini": {"in": 0.15, "out": 0.6},
    "ollama/qwen3-8b": {"in": 0.0, "out": 0.0},
    "ollama/qwen2.5-coder-7b": {"in": 0.0, "out": 0.0},
    "ollama/qwen2.5-1.5b": {"in": 0.0, "out": 0.0},
    "ollama/llama3.1-8b": {"in": 0.0, "out": 0.0},
    "github/copilot-cli": {"premium_request_usd": 0.04, "tokens": False},
}


_DEFAULT_DATA_DIR = Path(__file__).resolve().parent / "data"

_UNSAFE_FS_CHARS = re.compile(r"[^A-Za-z0-9._-]+")


def _pricing_for_model(model: str) -> tuple[dict[str, float], bool]:
    """Return pricing rates and whether pricing is intentionally known.

    Local Ollama model tags are open-ended (for example
    ``ollama/qwen2.5:7b-instruct-q8_0``), so treating only a fixed table of
    tags as known makes new free/local models look unclassified. Any
    ``ollama/*`` model is intentionally zero-cost for benchmark accounting.
    """
    if model.startswith("ollama/"):
        return {"in": 0.0, "out": 0.0, "cache_read": 0.0, "cache_write": 0.0}, True
    rates = PRICING.get(model, {})
    return rates, model in PRICING


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _flatten_model(model: str) -> str:
    return model.replace("/", "_").replace(":", "-")


def _safe_task_dirname(task_id: str) -> str:
    """Filesystem-safe form of ``task_id``. Only sanitizes if needed."""
    if _UNSAFE_FS_CHARS.search(task_id):
        return _UNSAFE_FS_CHARS.sub("_", task_id).strip("_") or "task"
    return task_id


def _extract_messages(payload: Any) -> tuple[Optional[str], Optional[str]]:
    """Best-effort extraction of (system_message, user_message) from a request payload.

    Supports the common Anthropic / OpenAI / Ollama shapes used by this repo.
    """
    if not isinstance(payload, dict):
        return None, None
    system = payload.get("system")
    if isinstance(system, list):
        # Anthropic system blocks: [{"type": "text", "text": "..."}]
        parts: list[str] = []
        for blk in system:
            if isinstance(blk, dict) and blk.get("type") == "text":
                parts.append(str(blk.get("text", "")))
            elif isinstance(blk, str):
                parts.append(blk)
        system = "\n\n".join(p for p in parts if p) or None
    elif system is not None and not isinstance(system, str):
        system = str(system)

    user_parts: list[str] = []
    for msg in payload.get("messages") or []:
        if not isinstance(msg, dict):
            continue
        role = msg.get("role")
        content = msg.get("content")
        if role == "system" and not system:
            system = content if isinstance(content, str) else json.dumps(content, ensure_ascii=False)
        elif role == "user":
            if isinstance(content, str):
                user_parts.append(content)
            elif isinstance(content, list):
                for blk in content:
                    if isinstance(blk, dict) and blk.get("type") == "text":
                        user_parts.append(str(blk.get("text", "")))
                    elif isinstance(blk, str):
                        user_parts.append(blk)
            elif content is not None:
                user_parts.append(json.dumps(content, ensure_ascii=False))
    user = "\n\n".join(p for p in user_parts if p) or None
    return system, user


def _extract_assistant_text(payload: Any) -> str:
    """Best-effort extraction of the assistant's text content from a response payload."""
    if not isinstance(payload, dict):
        return str(payload)
    # Copilot CLI NDJSON shape: {"events": [ {type: "assistant.message", ...}, ... ]}
    events = payload.get("events")
    if isinstance(events, list) and events:
        # Prefer the last assistant.message with non-empty content.
        final_msg = ""
        deltas_by_msg: dict[str, list[str]] = {}
        delta_order: list[str] = []
        for ev in events:
            if not isinstance(ev, dict):
                continue
            et = ev.get("type")
            data = ev.get("data") or {}
            if et == "assistant.message":
                content = data.get("content")
                if isinstance(content, str) and content.strip():
                    final_msg = content
            elif et == "assistant.message_delta":
                mid = str(data.get("messageId") or "_anon")
                chunk = data.get("deltaContent")
                if isinstance(chunk, str) and chunk:
                    if mid not in deltas_by_msg:
                        deltas_by_msg[mid] = []
                        delta_order.append(mid)
                    deltas_by_msg[mid].append(chunk)
            elif et == "assistant.final_answer":
                content = data.get("content") or data.get("text")
                if isinstance(content, str) and content.strip() and not final_msg:
                    final_msg = content
        if final_msg:
            return final_msg
        if delta_order:
            return "".join(deltas_by_msg[delta_order[-1]])
    # Claude Code CLI shape: {"type": "result", "result": "...", ...}
    if isinstance(payload.get("result"), str) and payload.get("type") == "result":
        return payload["result"]
    # Anthropic shape: {"content": [{"type": "text", "text": "..."}]}
    content = payload.get("content")
    if isinstance(content, list):
        parts: list[str] = []
        for blk in content:
            if isinstance(blk, dict) and blk.get("type") == "text":
                parts.append(str(blk.get("text", "")))
            elif isinstance(blk, str):
                parts.append(blk)
        if parts:
            return "\n\n".join(parts)
    if isinstance(content, str):
        return content
    # Ollama / OpenAI-ish: {"message": {"content": "..."}} or {"choices":[{"message":{"content":...}}]}
    msg = payload.get("message")
    if isinstance(msg, dict) and isinstance(msg.get("content"), str):
        return msg["content"]
    choices = payload.get("choices")
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            m = first.get("message")
            if isinstance(m, dict) and isinstance(m.get("content"), str):
                return m["content"]
            if isinstance(first.get("text"), str):
                return first["text"]
    return ""


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Plain UTF-8, no BOM, LF endings.
    with path.open("w", encoding="utf-8", newline="\n") as fp:
        fp.write(text)


def _atomic_write_json(path: Path, obj: Any) -> None:
    _atomic_write_text(path, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")


class Recorder:
    """Append-only JSONL recorder with budget enforcement and per-run subdir layout."""

    def __init__(
        self,
        benchmark: str,
        arm: str,
        model: str,
        budget_usd: float,
        fallback_model: Optional[str] = None,
        data_dir: Optional[Path] = None,
    ) -> None:
        self.benchmark = benchmark
        self.arm = arm
        self.model = model
        self.initial_model = model
        self.budget_usd = float(budget_usd)
        self.fallback_model = fallback_model
        self.run_id = uuid.uuid4().hex[:12]
        self.running_total_usd = 0.0
        self.warned_80 = False
        self.fallback_active = False
        self._aborted = False
        self._final_status: Optional[str] = None
        self._n_tasks = 0
        self._n_responses = 0
        self._n_errors = 0
        self._tokens_in = 0
        self._tokens_out = 0
        self._premium_requests = 0

        self.data_dir = Path(data_dir) if data_dir is not None else _DEFAULT_DATA_DIR
        self.data_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        self._ts = ts
        # Per-run subdirectory. Use double underscore between fields so model-flat
        # (which contains single underscores) is still parseable.
        self.run_dirname = f"{ts}__{self.benchmark}__{self.arm}__{_flatten_model(self.model)}__{self.run_id}"
        self.run_dir = self.data_dir / self.run_dirname
        self.run_dir.mkdir(parents=True, exist_ok=True)
        (self.run_dir / "per-task").mkdir(parents=True, exist_ok=True)

        self.events_path = self.run_dir / "events.jsonl"
        self.manifest_path = self.run_dir / "manifest.json"
        self.summary_path = self.run_dir / "summary.csv"
        self.replay_path = self.run_dir / "replay.txt"
        # Backwards-compat: keep .path pointing at the canonical event log.
        self.path = self.events_path

        self._fp = self.events_path.open("a", encoding="utf-8")
        self._wallclock_start = time.time()

        self._write(
            "run_start",
            {
                "benchmark": benchmark,
                "arm": arm,
                "model": model,
                "budget_usd": self.budget_usd,
                "fallback_model": fallback_model,
                "pricing_known": _pricing_for_model(model)[1],
            },
        )
        self._write_manifest(status="running")

    # ---- internals -------------------------------------------------

    def _write(self, event_type: str, payload: dict[str, Any]) -> None:
        record = {
            "ts": _utc_now_iso(),
            "run_id": self.run_id,
            "event_type": event_type,
        }
        record.update(payload)
        self._fp.write(json.dumps(record, ensure_ascii=False) + "\n")
        self._fp.flush()

    def _compute_cost(self, tokens: dict[str, int]) -> float:
        rates, _pricing_known = _pricing_for_model(self.model)
        if not rates:
            return 0.0
        # Premium-request billing (github/copilot-cli): cost = N * flat_rate.
        per_req_rate = rates.get("premium_request_usd")
        if per_req_rate is not None:
            n = int(tokens.get("premium_requests", 0) or 0)
            return float(n) * float(per_req_rate)
        # Per-million-token billing (Anthropic, OpenAI, Ollama-ish).
        cost = 0.0
        for k, v in tokens.items():
            rate = rates.get(k)
            if rate is None:
                continue
            cost += (float(v) * rate) / 1_000_000.0
        return cost

    def _budget_check(self) -> str:
        # 80% warning (once)
        if (
            not self.warned_80
            and self.budget_usd > 0
            and self.running_total_usd >= 0.8 * self.budget_usd
            and self.running_total_usd < self.budget_usd
        ):
            self.warned_80 = True
            self._write(
                "budget_warning",
                {
                    "spent_usd": round(self.running_total_usd, 6),
                    "budget_usd": self.budget_usd,
                    "threshold": 0.8,
                },
            )

        # Hard cap
        if self.budget_usd > 0 and self.running_total_usd >= self.budget_usd:
            if self.fallback_model and not self.fallback_active:
                old = self.model
                self.model = self.fallback_model
                self.fallback_active = True
                self._write(
                    "fallback_triggered",
                    {
                        "from_model": old,
                        "to_model": self.fallback_model,
                        "spent_usd": round(self.running_total_usd, 6),
                    },
                )
                return "fallback"
            if self.fallback_active:
                return "continue"
            if not self._aborted:
                self._aborted = True
                self._write(
                    "budget_exceeded",
                    {
                        "spent_usd": round(self.running_total_usd, 6),
                        "budget_usd": self.budget_usd,
                    },
                )
            return "abort"
        return "continue"

    def _task_dir(self, task_id: str) -> Path:
        d = self.run_dir / "per-task" / _safe_task_dirname(task_id)
        d.mkdir(parents=True, exist_ok=True)
        return d

    def _read_task_meta(self, task_id: str) -> dict[str, Any]:
        p = self._task_dir(task_id) / "metadata.json"
        if p.exists():
            try:
                return json.loads(p.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                pass
        return {"task_id": task_id}

    def _write_task_meta(self, task_id: str, meta: dict[str, Any]) -> None:
        _atomic_write_json(self._task_dir(task_id) / "metadata.json", meta)

    def _write_manifest(self, status: str) -> None:
        manifest = {
            "run_id": self.run_id,
            "benchmark": self.benchmark,
            "arm": self.arm,
            "initial_model": self.initial_model,
            "current_model": self.model,
            "fallback_model": self.fallback_model,
            "fallback_active": self.fallback_active,
            "budget_usd": self.budget_usd,
            "started_at_utc": self._ts,
            "ended_at_utc": _utc_now_iso() if status != "running" else None,
            "status": status,
            "running_total_usd": round(self.running_total_usd, 6),
            "n_tasks": self._n_tasks,
            "n_responses": self._n_responses,
            "n_errors": self._n_errors,
            "tokens_in": self._tokens_in,
            "tokens_out": self._tokens_out,
            "premium_requests_total": self._premium_requests,
            "wallclock_seconds": round(time.time() - self._wallclock_start, 3),
            "pricing_known": _pricing_for_model(self.initial_model)[1],
            "events_path": str(self.events_path.relative_to(self.run_dir)),
            "summary_path": str(self.summary_path.relative_to(self.run_dir)),
            "replay_path": str(self.replay_path.relative_to(self.run_dir)),
        }
        _atomic_write_json(self.manifest_path, manifest)

    def _write_summary_csv(self) -> None:
        header = (
            "run_id,benchmark,arm,model,n_tasks,total_tokens_in,total_tokens_out,"
            "total_cost_usd,wallclock_seconds,n_errors\n"
        )
        wall = round(time.time() - self._wallclock_start, 3)
        row = (
            f"{self.run_id},{self.benchmark},{self.arm},{self.initial_model},"
            f"{self._n_tasks},{self._tokens_in},{self._tokens_out},"
            f"{self.running_total_usd:.6f},{wall},{self._n_errors}\n"
        )
        _atomic_write_text(self.summary_path, header + row)

    def _render_replay_in_process(self) -> None:
        # Imported lazily to avoid import-cycle concerns.
        from benchmark.runs.replay import render
        try:
            text = render(self.events_path)
        except Exception as exc:  # pragma: no cover - defensive
            text = f"!! replay rendering failed: {exc}"
        _atomic_write_text(self.replay_path, text + ("\n" if not text.endswith("\n") else ""))

    # ---- public events ---------------------------------------------

    def task_start(self, task_id: str, prompt: str, metadata: Optional[dict] = None) -> None:
        self._n_tasks += 1
        self._write(
            "task_start",
            {"task_id": task_id, "prompt": prompt, "metadata": metadata or {}},
        )
        # Initial per-task metadata stub. The prompt.md will be written when
        # request() supplies the full payload (system + user).
        meta = {
            "task_id": task_id,
            "started_at_utc": _utc_now_iso(),
            "metadata": metadata or {},
            "model": self.model,
            "status": "running",
        }
        self._write_task_meta(task_id, meta)
        # Fallback: write a minimal prompt.md from the prompt arg now so it
        # exists even if request() is never called.
        prompt_md = (
            "## System message\n\n"
            "(no system message)\n\n"
            "## User prompt\n\n"
            f"{prompt}\n"
        )
        _atomic_write_text(self._task_dir(task_id) / "prompt.md", prompt_md)

    def request(self, task_id: str, payload: dict[str, Any]) -> None:
        self._write("request", {"task_id": task_id, "payload": payload, "model": self.model})
        # Persist the full request body for replay.
        _atomic_write_json(self._task_dir(task_id) / "request.json", payload)
        # Re-render prompt.md from the actual request so system + user are
        # delineated for grep-friendliness.
        system, user = _extract_messages(payload)
        prompt_md = (
            "## System message\n\n"
            f"{system if system else '(no system message)'}\n\n"
            "## User prompt\n\n"
            f"{user if user else '(no user prompt)'}\n"
        )
        _atomic_write_text(self._task_dir(task_id) / "prompt.md", prompt_md)

    def response(
        self,
        task_id: str,
        payload: dict[str, Any],
        tokens: Optional[dict[str, int]] = None,
        wallclock_ms: Optional[float] = None,
    ) -> str:
        tokens = tokens or {}
        cost = self._compute_cost(tokens)
        self.running_total_usd += cost
        self._n_responses += 1
        self._tokens_in += int(tokens.get("in", 0) or 0)
        self._tokens_out += int(tokens.get("out", 0) or 0)
        self._premium_requests += int(tokens.get("premium_requests", 0) or 0)
        self._write(
            "response",
            {
                "task_id": task_id,
                "payload": payload,
                "tokens": tokens,
                "cost_usd": round(cost, 6),
                "running_total_usd": round(self.running_total_usd, 6),
                "wallclock_ms": wallclock_ms,
                "model": self.model,
            },
        )
        # Persist response artifacts.
        _atomic_write_json(self._task_dir(task_id) / "response_raw.json", payload)
        text = _extract_assistant_text(payload)
        _atomic_write_text(self._task_dir(task_id) / "response.md", (text.rstrip() + "\n") if text else "(empty response)\n")
        meta = self._read_task_meta(task_id)
        meta.update(
            {
                "tokens": tokens,
                "cost_usd": round(cost, 6),
                "wallclock_ms": wallclock_ms,
                "model": self.model,
            }
        )
        self._write_task_meta(task_id, meta)
        return self._budget_check()

    def tool_call(self, task_id: str, name: str, args: dict[str, Any]) -> None:
        self._write("tool_call", {"task_id": task_id, "name": name, "args": args})

    def tool_result(self, task_id: str, name: str, result: Any) -> None:
        self._write("tool_result", {"task_id": task_id, "name": name, "result": result})

    def rubric_score(
        self,
        task_id: str,
        rubric_dict: dict[str, Any],
        total: float,
        rater: str = "self",
    ) -> None:
        self._write(
            "rubric_score",
            {"task_id": task_id, "rubric": rubric_dict, "total": total, "rater": rater},
        )

    def task_end(self, task_id: str, status: str = "ok", error: Optional[str] = None) -> None:
        if status not in (None, "ok"):
            self._n_errors += 1
        self._write("task_end", {"task_id": task_id, "status": status, "error": error})
        meta = self._read_task_meta(task_id)
        meta["status"] = status
        meta["error"] = error
        meta["ended_at_utc"] = _utc_now_iso()
        self._write_task_meta(task_id, meta)

    def error(self, task_id: Optional[str], message: str, kind: str = "error") -> None:
        self._n_errors += 1
        self._write("error", {"task_id": task_id, "message": message, "kind": kind})

    def run_end(self, status: str = "ok") -> None:
        if self._final_status is not None:
            return
        self._final_status = status
        wallclock_seconds = round(time.time() - self._wallclock_start, 3)
        self._write(
            "run_end",
            {
                "status": status,
                "total_spent_usd": round(self.running_total_usd, 6),
                "wallclock_seconds": wallclock_seconds,
                "fallback_active": self.fallback_active,
            },
        )
        try:
            self._fp.close()
        except Exception:
            pass
        # Finalize per-run artifacts.
        self._write_summary_csv()
        self._write_manifest(status=status)
        self._render_replay_in_process()

    # context-manager sugar (optional)
    def __enter__(self) -> "Recorder":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if exc is not None:
            self.error(task_id=None, message=str(exc), kind=exc_type.__name__ if exc_type else "error")
            self.run_end(status="error")
        else:
            self.run_end(status="ok")
