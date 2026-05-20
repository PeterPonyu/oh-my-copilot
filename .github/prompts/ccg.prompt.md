---
name: ccg
description: Tri-model orchestration — Claude + Codex + Gemini in parallel, then Claude synthesizes
argument-hint: "<question or task>"
---

# /omcp:ccg

Claude-Codex-Gemini parallel advisor. Use when:
- You want cross-validation across multiple LLM providers
- The question benefits from divergent perspectives (architecture vs. UX, security vs. ergonomics)
- A single-provider response would be a one-shot guess

The skill at `skills/ccg/SKILL.md` defines the full procedure:

1. In parallel: invoke `omc ask codex "<q>"` AND `omc ask gemini "<q>"` (each saves to `.omcp/artifacts/ask/`).
2. Wait for both to complete; if one provider is unavailable, continue with the rest and note the gap.
3. Synthesize Claude's response that integrates findings from both, citing each source artifact path. Don't just concatenate — find consensus, flag disagreements, recommend.

For a single provider, use `/omcp:ask <provider> <q>` instead.

Question: {{ARGUMENTS}}
