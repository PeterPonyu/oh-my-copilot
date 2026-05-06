# ralph port — UNRESOLVED (Wave 5 P0)

The translator (`scripts/translate-omc-skill.mjs`) exited code 3 when porting
`references/oh-my-claudecode/skills/ralph/SKILL.md` because that source instructs
the model to invoke a primitive that is **not in the v1 agent list**:

- Blocker token: `ai-slop-cleaner`
- Source line(s): SKILL.md:109 / 132 / 217 — references `Skill("ai-slop-cleaner")`
  and warns against `Task(subagent_type="oh-my-claudecode:ai-slop-cleaner")`.

`ai-slop-cleaner` is itself a skill (not a Wave 4 agent) and is not in the
Wave 4 agent allowlist (14 agents + research = 15) recognized by the translator.

## Why this file exists
Per Wave 5 contract, on translator exit 3 we MUST:
- (a) note the blocker (this file)
- (b) skip that skill's port
- (c) continue with the others
We do NOT invent agent names or hand-author SKILL.md content.

## Resolution path (out of scope for Wave 5)
A later wave can decide to either:
1. Add `ai-slop-cleaner` as a recognized skill primitive in
   `translate-omc-skill.mjs`, OR
2. Port `ai-slop-cleaner` as a sibling skill first, then re-run the ralph
   translation, OR
3. Hand-author a translator pre-pass that strips ai-slop-cleaner references
   when not desired in copilot-cli.
