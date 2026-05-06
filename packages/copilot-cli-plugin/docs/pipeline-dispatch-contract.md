# Pipeline Dispatch Contract (Wave 4.5)

Authoritative reference for translating oh-my-claudecode (OMC) skills, agents, and
slash-command bodies to oh-my-copilot (OMX) Copilot CLI shape. This document is the
single source of truth that `scripts/translate-omc-skill.mjs` implements.

This is **structural translation, not string substitution**. Copilot CLI has no
`Skill()` callable and no `Task(subagent_type=...)` callable. Copilot dispatches
through YAML frontmatter + auto-delegation; everything else becomes prose.

---

## 1. Frontmatter contract

The Copilot-side frontmatter shape is verified against the live repo file
`/home/zeyufu/Desktop/oh-my-copilot/.github/prompts/research.prompt.md` (lines 1–6):

```yaml
---
name: research
description: Root alias for source-grounding a workspace, plugin, or Copilot capability claim.
agent: research
argument-hint: "<claim, question, or target file>"
---
```

The four observed fields are the **complete** contract:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Slug; matches command/skill filename. |
| `description` | yes | One-line summary. |
| `agent` | command files only | The auto-delegation target. **Omitted from `SKILL.md`** because Copilot's `SKILL.md` has the same shape as Claude Code's (markdown with `name` + `description`); skills do not pin an agent. |
| `argument-hint` | optional | Quoted string. Matches existing `.github/prompts/*.prompt.md` convention. |

**Fields that must NOT be emitted by the translator** (not present in live frontmatter):

- `model:` — Copilot CLI has no model-tier field today. If OMC source carries `model:`, drop with a logged warning in `_omc-port-diff.md`.
- `tools:` — Same reason. Drop with logged warning.

Any other OMC-only fields (`pipeline`, `next-skill`, `next-skill-args`, `handoff`,
`level`) are **preserved as-is** in `SKILL.md` because they are body metadata for the
skill author, not Copilot CLI dispatch fields. The translator does not remove them
unless explicitly listed above.

---

## 2. Translation table — the three OMC primitives

| OMC primitive | Copilot-CLI equivalent | Failure-mode handling |
|---|---|---|
| `Skill("oh-my-claudecode:<X>")` mid-flow | English-prose handoff: `[Run /<X> to continue the pipeline]` (markdown link-text style). The slash command file lives at `commands/<X>.md` (Wave 6). | If `<X>` is not yet ported / lives in P1, translator emits `<!-- TODO: P0/P1 skill <X> may need its slash command in commands/<X>.md (Wave 6) -->` adjacent and continues. |
| `Task(subagent_type="oh-my-claudecode:<Y>", model=<M>)` | Prose dispatch: `[Delegate to the <Y> agent]`. Copilot's auto-delegation picks up the agent named in `packages/copilot-cli-plugin/agents/<Y>.agent.md`. The model tier (`opus`/`sonnet`/`haiku`) is **dropped** with a comment because Copilot has no model-tier field today. | If `<Y>` is not in the v1 agent port list, translator FAILS LOUD (exit code 3). Forces explicit decision; no silent dispatch to a non-existent agent. |
| `mcp__plugin_oh-my-claudecode_t__<tool>` (e.g. `state_read`, `notepad_write`) | `mcp__oh-my-copilot__<tool>` (matches Wave 3 server name). | If `<tool>` is not in Wave 3 v1 surface (`state_read`, `state_write`, `state_list`, `notepad_read`, `notepad_write`, `plan_list`), translator emits `<!-- TODO: MCP tool <tool> not in v1 server -->` adjacent. |

**Bonus rule** (commentary cleanup): occurrences of the literal namespace string
`oh-my-claudecode:` outside primitive call-sites are rewritten to `oh-my-copilot:`
so cross-references in prose stay correct.

---

## 3. Determinism + idempotency contract

1. **Deterministic output** — same input bytes produce byte-identical output bytes
   across runs. No timestamps in `SKILL.md`. No random ordering. Replacement order
   is single-pass left-to-right per primitive type, executed in this fixed order:
   1. Skill calls
   2. Task calls
   3. MCP tool identifiers
   4. Namespace string `oh-my-claudecode:` → `oh-my-copilot:`
2. **Idempotent re-runs** — running the translator on already-translated output is
   a no-op. Detection: the sentinel comment
   `<!-- omc-port-translated: v1 -->` is the first non-blank body line after
   frontmatter. If present, the translator exits 0 with `no-op (already translated)`.
3. **Provenance line** — directly after the sentinel, the translator emits
   `<!-- source: <relative-path-to-OMC-source> | wave: 4.5 -->` so reviewers can
   diff side-by-side with the OMC source.
4. **Audit log** — every translation appends a JSON line to
   `.omc/state/_omc-port-translations.jsonl` with `{timestamp, input, output,
   replacements}`. The audit log is the only place a timestamp appears; the
   `SKILL.md` output itself stays timestamp-free for byte-identity.
5. **Drift detection** — `--check` mode re-translates and compares to the destination;
   exit 4 on drift. CI runs this on every PR.

---

## 4. Sentinels and markers (canonical strings)

| Marker | Where | Purpose |
|---|---|---|
| `<!-- omc-port-translated: v1 -->` | First body line of every translated `SKILL.md` | Idempotency gate. Bumping to `v2` forces re-translation (intentional break). |
| `<!-- source: <path> \| wave: 4.5 -->` | Second body line | Provenance. |
| `<!-- TODO: P0/P1 skill <X> may need its slash command in commands/<X>.md (Wave 6) -->` | Adjacent to skill handoff | Wave 6 follow-up. |
| `<!-- TODO: agent <Y> must be in agents/<Y>.agent.md (Wave 4) -->` | Adjacent to agent delegate | Wave 4 follow-up. |
| `<!-- TODO: MCP tool <tool> not in v1 server -->` | Adjacent to MCP tool reference | Wave 3 follow-up. |

---

## 5. File paths produced by the translator

For input dir `<src>/SKILL.md` and output dir `<dst>/`:

| Output file | Content |
|---|---|
| `<dst>/SKILL.md` | Translated skill body. Frontmatter preserved (minus `model:`/`tools:` if present). |
| `<dst>/_omc-port-diff.md` | Per-line replacement log: `line N: <before> -> <after>`. Sorted ascending by line number (deterministic). |
| `.omc/state/_omc-port-translations.jsonl` | Append-only audit (only place timestamps appear). |

---

## 6. Exit-code contract

| Code | Meaning |
|---|---|
| 0 | Success, OR already-translated no-op. |
| 1 | Input directory or `SKILL.md` not found. |
| 2 | Output directory conflict (cannot create or pre-existing files block write). |
| 3 | Translation hit a primitive that requires manual decision (e.g. `Task(subagent_type=<Y>)` where `<Y>` is not in the v1 agent list). Fails LOUD. |
| 4 | `--check` mode detected drift between expected output and actual output. |

---

## 7. Wave 3 v1 MCP tool surface

The translator treats these tools as known-good (no TODO comment):

- `state_read`
- `state_write`
- `state_list`
- `notepad_read`
- `notepad_write`
- `plan_list`

Anything else gets a TODO marker so reviewers can extend the v1 server later.

---

## 8. Frontmatter source citation

The 4-field contract above is verified against
`/home/zeyufu/Desktop/oh-my-copilot/.github/prompts/research.prompt.md`,
lines 1–6, which is the only live evidence of Copilot CLI's frontmatter shape in
this repo today. Any future fields must be added to this contract first, with a
new repo-evidence citation, before the translator emits them.
