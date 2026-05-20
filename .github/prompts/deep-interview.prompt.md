---
name: deep-interview
description: "[OMCP] Socratic interview with mathematical ambiguity gating — refuses to proceed until clarity threshold is met"
agent: planner
argument-hint: "[--quick|--standard|--deep] [--autoresearch] <vague idea or description>"
---

# /omcp:deep-interview

Iterative requirements gathering before any execution commits. Use when the input is genuinely vague ("I want a thing that does X-ish", "not sure exactly", "help me figure out") and you'd otherwise burn execution cycles on scope discovery. The skill scores ambiguity across weighted dimensions after every answer and refuses to hand off until the threshold for the chosen mode is met.

**Cost:** Q&A rounds with one question per round, weakest-dimension targeted. Typically 5-15 rounds. Read-only — no code is modified. Stop with `/omcp:cancel`; state is checkpointed and resumable.

**Use instead** when:
- Input already has files, function names, or acceptance criteria → skip and run `/omcp:autopilot` or `/omcp:ralph` directly
- Want to brainstorm options without commitment → `/omcp:plan`
- User says "just do it" / "skip the questions" → respect intent, no interview

The skill at `skills/deep-interview/SKILL.md` defines the full procedure. Flag handling:

| Flag | Threshold | Use for |
|---|---|---|
| `--quick` | Higher (looser) | Small features, quick clarification |
| `--standard` (default) | Default mid threshold | Most non-trivial work |
| `--deep` | Lowest (strictest) | High-risk: auth, migrations, public APIs |
| `--autoresearch` | Mission + evaluator gates added | Setup lane for the stateful `autoresearch` skill |

Procedure highlights:
1. Ask **one** question per round — never batch.
2. Target the weakest clarity dimension. Name the dimension and its score in every round.
3. Gather codebase facts via the `explore` agent **before** asking the user about them. For brownfield questions, cite the repo evidence (file path, symbol) that triggered the question.
4. Score after every answer. Show the score transparently.
5. Don't proceed until ambiguity ≤ resolved threshold for the run.
6. Allow early exit with explicit warning if user insists.

Output: `.omcp/specs/deep-interview-<slug>.md` with provenance frontmatter (`produced-by: deep-interview`, `produced-at: <ISO-8601>`, `pipeline-stage: spec`). Ephemeral state lives in `.omcp/state/deep-interview-state.json` for resume.

After writing the spec, the skill calls `mcp__omcp__pipeline_record_transition` with `from: null, to: "spec"`. Downstream `/omcp:ralplan` or `/omcp:autopilot` will detect the spec and short-circuit their own discovery phases.

**Autoresearch mode:** when `--autoresearch` is set, the skill also collects an evaluator command (mission + evaluator are hard gates beyond ambiguity), then hands off to `/omcp:autoresearch` instead of bridging into ralplan/autopilot.

Idea: {{ARGUMENTS}}
