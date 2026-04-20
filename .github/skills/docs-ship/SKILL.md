---
name: docs-ship
description: Run root documentation and Copilot surface checks before declaring a root change complete.
user-invocable: true
---

# Docs Ship

Use this root workspace skill after changes to docs, instructions, prompts,
agents, skills, hooks, examples, or the plugin package.

## Run

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
```

If a dedicated root surface validator exists, run it after the two commands
above:

```bash
./scripts/validate-root-copilot-surfaces.sh
```

## Goal

- prefer concrete validation output over "looks good";
- verify root-relative commands from the repository root;
- keep root workspace, plugin package, and example workspace evidence separate;
- report remaining manual Copilot smoke-test gaps honestly.
