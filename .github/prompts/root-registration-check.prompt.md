---
name: root-registration-check
description: Verify root instructions, agents, prompts, skills, and hook routing as a workspace registration audit.
agent: verifier
argument-hint: "[optional changed surface]"
---

Audit the root Copilot workspace registration.

Verify:

- root `AGENTS.md` and `.github/copilot-instructions.md` exist and preserve the
  CLI-first boundary;
- `.github/instructions/*.instructions.md` have `applyTo` frontmatter and bodies;
- root agents exist for `research`, `reviewer`, and `verifier`;
- prompt `agent:` values point to root agents;
- root skills call root-relative validation or plugin scripts;
- hook evidence, if in scope, is root-session evidence and identifies its source.

Report automated PASS/FAIL evidence separately from manual Copilot smoke-test
items.
