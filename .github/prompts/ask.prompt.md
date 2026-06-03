---
name: ask
description: "[OMCP] Process-first advisor routing — query Claude, Codex, or Gemini via `/omcp:ask` with artifact capture"
argument-hint: "<claude|codex|gemini> <question>"
---

# /omcp:ask

Single-provider external advisor. Routes a question to one of the three configured CLI providers and captures the response as an artifact under `.omcp/artifacts/ask/`.

The skill at `skills/ask/SKILL.md` defines the full procedure. Parse `{{ARGUMENTS}}` as `<provider> <question>`:

- `claude <q>` → route through `/omcp:ask claude` (or skip if Claude CLI unavailable)
- `codex <q>` → route through `/omcp:ask codex` (or skip if Codex CLI unavailable)
- `gemini <q>` → route through `/omcp:ask gemini` (or skip if Gemini CLI unavailable)

For multi-provider tri-perspective synthesis, use `/omcp:ccg <q>` instead — that calls both codex + gemini and synthesizes Claude's view across all three.

Always quote the artifact path back to the user. Don't dump the raw response into the chat without context.

Query: {{ARGUMENTS}}
