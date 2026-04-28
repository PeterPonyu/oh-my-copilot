"""Zero-dependency Ollama client for local/free benchmark runs."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any

DEFAULT_HOST = "http://127.0.0.1:11434"
DEFAULT_MODEL_PREFERENCE = (
    "qwen2.5:7b-instruct-q8_0",
    "qwen3:8b",
    "qwen2.5:3b",
    "qwen2.5:1.5b",
)


class OllamaError(RuntimeError):
    """Raised when Ollama is unavailable or returns an unusable response."""


def _json_request(url: str, payload: dict[str, Any] | None, timeout: float) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="GET" if payload is None else "POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise OllamaError(f"Ollama HTTP {exc.code} for {url}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise OllamaError(f"Ollama request failed for {url}: {exc.reason}") from exc
    except TimeoutError as exc:
        raise OllamaError(f"Ollama request timed out for {url}") from exc
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise OllamaError(f"Ollama returned malformed JSON from {url}: {raw[:200]!r}") from exc
    if not isinstance(parsed, dict):
        raise OllamaError(f"Ollama returned non-object JSON from {url}")
    return parsed


def list_models(host: str = DEFAULT_HOST, timeout: float = 5.0) -> list[str]:
    """Return installed Ollama model names from ``/api/tags``."""
    base = host.rstrip("/")
    parsed = _json_request(f"{base}/api/tags", None, timeout)
    models = parsed.get("models")
    if not isinstance(models, list):
        raise OllamaError("Ollama /api/tags response did not contain a models list")
    names: list[str] = []
    for item in models:
        if isinstance(item, dict) and isinstance(item.get("name"), str):
            names.append(item["name"])
    return names


def choose_model(
    requested: str | None = None,
    host: str = DEFAULT_HOST,
    timeout: float = 5.0,
    preference: tuple[str, ...] = DEFAULT_MODEL_PREFERENCE,
) -> str:
    """Choose an installed local model, honoring an explicit request first."""
    if requested:
        return requested.removeprefix("ollama/")
    installed = set(list_models(host=host, timeout=timeout))
    for candidate in preference:
        if candidate in installed:
            return candidate
    raise OllamaError(
        "No preferred free/local Ollama model is installed. "
        f"Install one of {', '.join(preference)} or pass --model explicitly."
    )


def call_ollama_chat(
    messages: list[dict[str, str]],
    model: str,
    host: str = DEFAULT_HOST,
    timeout: float = 180.0,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Call ``/api/chat`` with ``stream:false`` and normalize recorder fields."""
    base = host.rstrip("/")
    model_name = model.removeprefix("ollama/")
    request_body: dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "stream": False,
    }
    if options:
        request_body["options"] = options

    t0 = time.time()
    raw = _json_request(f"{base}/api/chat", request_body, timeout)
    wallclock_ms = int((time.time() - t0) * 1000)

    if raw.get("error"):
        raise OllamaError(f"Ollama model {model_name!r} failed: {raw['error']}")
    message = raw.get("message")
    if not isinstance(message, dict) or not isinstance(message.get("content"), str):
        raise OllamaError(f"Ollama response missing message.content for model {model_name!r}")

    prompt_tokens = int(raw.get("prompt_eval_count") or 0)
    output_tokens = int(raw.get("eval_count") or 0)
    total_duration = raw.get("total_duration")
    api_duration_ms = int(total_duration / 1_000_000) if isinstance(total_duration, (int, float)) else wallclock_ms

    return {
        "content": message["content"],
        "tokens": {
            "input": prompt_tokens,
            "output": output_tokens,
            "cache_read": 0,
            "cache_write": 0,
        },
        "premium_requests": 0,
        "session_duration_ms": wallclock_ms,
        "api_duration_ms": api_duration_ms,
        "skills_loaded": [],
        "raw": raw,
        "wallclock_ms": wallclock_ms,
        "stop_reason": raw.get("done_reason") or "ok",
        "request_body": {"backend": "ollama_chat", "host": base, **request_body},
    }
