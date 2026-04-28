"""GitHub Copilot CLI invocation wrapper for the benchmark recorder.

Shells out to ``copilot -p "..." --output-format json --allow-all-tools``,
parses the NDJSON event stream, and returns a normalized dict.

The cwd at invocation determines which skills are auto-loaded:
  - vanilla arm: cwd is a fresh tempdir with no ``.github/skills/``
  - with-omc arm: cwd is the project root (skills auto-load)

Returned shape (matches what ``Recorder.response`` expects)::

    {
      "content":             str,
      "tokens":              {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0},
      "premium_requests":    int,
      "session_duration_ms": int,
      "api_duration_ms":     int,
      "skills_loaded":       list[dict],
      "raw":                 {"events": [...]},
      "wallclock_ms":        int,
      "stop_reason":         "ok" | "error",
      "request_body":        {"backend": "copilot_cli", "prompt": str, "workdir": str, "cmd": [...]},
    }

Copilot does not expose token counts; billing is in ``premiumRequests``.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import time
from typing import Any, Optional


VISIBLE_TEXT_EVENT_TYPES = (
    "assistant.message",          # final consolidated assistant message (preferred)
    "assistant.message_delta",    # streaming chunks (concatenated as fallback)
    "assistant.final_answer",     # alternative final-answer event (older builds)
)


class CopilotError(RuntimeError):
    """Raised when the copilot CLI call fails or produces no usable result."""


def _coerce_int(v: Any) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def _extract_visible_text(events: list[dict]) -> tuple[str, list[str]]:
    """Pull user-visible assistant text from the event stream.

    Strategy:
      1. Prefer the last ``assistant.message`` event with a non-empty
         ``data.content`` string (this is the consolidated final reply).
      2. Otherwise, concatenate ``assistant.message_delta`` ``deltaContent``
         in order, grouped by ``messageId`` (last group wins).
      3. Otherwise, look for ``assistant.final_answer`` ``data.content``.

    Returns ``(text, seen_event_types)`` so the caller can report which
    event types actually carried text.
    """
    seen: list[str] = []
    final_message_text = ""
    deltas_by_msg: dict[str, list[str]] = {}
    delta_order: list[str] = []
    final_answer_text = ""

    for ev in events:
        et = ev.get("type")
        if et not in VISIBLE_TEXT_EVENT_TYPES:
            continue
        data = ev.get("data") or {}

        if et == "assistant.message":
            content = data.get("content")
            if isinstance(content, str) and content.strip():
                final_message_text = content  # last one wins
                if "assistant.message" not in seen:
                    seen.append("assistant.message")

        elif et == "assistant.message_delta":
            mid = str(data.get("messageId") or "_anon")
            chunk = data.get("deltaContent")
            if isinstance(chunk, str) and chunk:
                if mid not in deltas_by_msg:
                    deltas_by_msg[mid] = []
                    delta_order.append(mid)
                deltas_by_msg[mid].append(chunk)
                if "assistant.message_delta" not in seen:
                    seen.append("assistant.message_delta")

        elif et == "assistant.final_answer":
            content = data.get("content") or data.get("text")
            if isinstance(content, str) and content.strip():
                final_answer_text = content
                if "assistant.final_answer" not in seen:
                    seen.append("assistant.final_answer")

    if final_message_text:
        return final_message_text, seen
    if delta_order:
        last = delta_order[-1]
        return "".join(deltas_by_msg[last]), seen
    if final_answer_text:
        return final_answer_text, seen
    return "", seen


def _extract_skills_loaded(events: list[dict]) -> list[dict]:
    """Return the last ``session.skills_loaded`` payload's skill list."""
    last: list[dict] = []
    for ev in events:
        if ev.get("type") != "session.skills_loaded":
            continue
        data = ev.get("data") or {}
        skills = data.get("skills")
        if isinstance(skills, list):
            last = [
                {
                    "name": s.get("name"),
                    "source": s.get("source"),
                    "enabled": s.get("enabled"),
                }
                for s in skills
                if isinstance(s, dict)
            ]
    return last


def _extract_result(events: list[dict]) -> Optional[dict]:
    """Return the last ``result`` event (the run's terminal usage frame)."""
    found: Optional[dict] = None
    for ev in events:
        if ev.get("type") == "result":
            found = ev
    return found


def call_copilot(
    prompt: str,
    workdir: str,
    model: Optional[str] = None,
    timeout: float = 180.0,
) -> dict[str, Any]:
    """Invoke ``copilot -p <prompt> --output-format json --allow-all-tools``.

    Args:
      prompt: The user prompt to send.
      workdir: Working directory for the subprocess. Determines which skills
        are auto-loaded (any ``.github/skills/`` under ``workdir`` is
        auto-discovered).
      model: Optional model id. Currently unused (Copilot picks its own
        default; reserved for future ``--model`` flag support).
      timeout: Wall-clock subprocess timeout, seconds.

    Returns the normalized dict shape documented in the module docstring.

    Raises:
      CopilotError: If the binary is missing, exits non-zero, times out,
        or never emits a ``result`` event.
    """
    binary = shutil.which("copilot")
    if binary is None:
        raise CopilotError(
            "copilot CLI not found on PATH. Install GitHub Copilot CLI "
            "(https://github.com/github/copilot-cli) and re-run."
        )

    cmd = [binary, "-p", prompt, "--output-format", "json", "--allow-all-tools"]
    request_body = {
        "backend": "copilot_cli",
        "prompt": prompt,
        "workdir": workdir,
        "cmd": cmd,
        "model": model,
    }

    t0 = time.time()
    try:
        proc = subprocess.run(
            cmd,
            cwd=workdir,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise CopilotError(f"copilot CLI timed out after {timeout}s") from exc
    wallclock_ms = int((time.time() - t0) * 1000)

    # Parse NDJSON line-by-line; keep malformed lines for diagnostics.
    events: list[dict] = []
    malformed: list[str] = []
    for line in proc.stdout.splitlines():
        s = line.strip()
        if not s:
            continue
        try:
            events.append(json.loads(s))
        except json.JSONDecodeError:
            malformed.append(s[:200])

    result_ev = _extract_result(events)

    if proc.returncode != 0 or result_ev is None:
        tail = events[-5:] if events else []
        raise CopilotError(
            f"copilot CLI failed: exit={proc.returncode}, "
            f"events={len(events)}, malformed_lines={len(malformed)}, "
            f"result_event_present={result_ev is not None}\n"
            f"stderr (last 500 chars): {proc.stderr[-500:]!r}\n"
            f"last 5 events: {json.dumps(tail, ensure_ascii=False)[:1500]}"
        )

    content, seen_event_types = _extract_visible_text(events)
    skills_loaded = _extract_skills_loaded(events)
    usage = (result_ev.get("usage") or {}) if isinstance(result_ev, dict) else {}
    code_changes = usage.get("codeChanges") or {}

    return {
        "content": content,
        "tokens": {
            "input": 0,
            "output": 0,
            "cache_read": 0,
            "cache_write": 0,
        },
        "premium_requests": _coerce_int(usage.get("premiumRequests")),
        "session_duration_ms": _coerce_int(usage.get("sessionDurationMs")),
        "api_duration_ms": _coerce_int(usage.get("totalApiDurationMs")),
        "code_changes": {
            "lines_added": _coerce_int(code_changes.get("linesAdded")),
            "lines_removed": _coerce_int(code_changes.get("linesRemoved")),
            "files_modified": list(code_changes.get("filesModified") or []),
        },
        "skills_loaded": skills_loaded,
        "raw": {"events": events},
        "wallclock_ms": wallclock_ms,
        "stop_reason": "ok",
        "visible_text_event_types": seen_event_types,
        "request_body": request_body,
    }
