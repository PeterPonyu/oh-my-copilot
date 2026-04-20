---
name: root-surface-audit
description: Audit root Copilot instructions, agents, prompts, skills, and routing references.
user-invocable: true
---

# Root Surface Audit

Use this root workspace skill when checking whether the repository root is ready
for Copilot workspace discovery.

## Run

```bash
find .github/instructions -maxdepth 1 -name '*.instructions.md' -type f -print | sort
find .github/agents -maxdepth 1 -name '*.agent.md' -type f -print | sort
find .github/prompts -maxdepth 1 -name '*.prompt.md' -type f -print | sort
find .github/skills -mindepth 2 -maxdepth 2 -name 'SKILL.md' -type f -print | sort
./scripts/validate-power-surfaces.sh
```

If a dedicated root surface validator exists, run it too:

```bash
./scripts/validate-root-copilot-surfaces.sh
```

## Checklist

- Every prompt `agent:` points to a root `.github/agents/<agent>.agent.md` file.
- Every agent handoff points to a root agent that exists.
- Root skills call commands that are valid from the repository root.
- Root copy preserves the CLI-first boundary and does not depend on nested
  examples for proof.
