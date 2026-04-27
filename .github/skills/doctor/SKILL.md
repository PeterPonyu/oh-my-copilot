---
name: doctor
description: Diagnose Copilot CLI and oh-my-copilot installation health and surface fixable issues.
user-invocable: true
---

# Doctor

Use this root workspace skill when Copilot CLI behavior in this repository
looks broken, stale, or partially installed, and you want a structured
diagnosis before changing anything.

## Copilot CLI host note

- The skill runs read-only diagnostics by default. Fixes are only applied if
  the user explicitly confirms.
- Verify any host-product commands listed below against your installed
  Copilot CLI version — flag with a clear placeholder note if a command name
  has drifted.
- Diagnostics are repo-local plus the user's Copilot CLI config locations.
  This skill does not touch GitHub-side state.

## Checks

### 1. Copilot CLI installation

```bash
copilot --version            # verify against your installed version
which copilot
```

Diagnosis:
- missing binary -> CRITICAL: Copilot CLI not installed.
- version older than the version this repo's docs cite -> WARN: outdated CLI.

### 2. Repository surface registration

```bash
ls .github/instructions/*.instructions.md 2>/dev/null
ls .github/agents/*.agent.md 2>/dev/null
ls .github/prompts/*.prompt.md 2>/dev/null
find .github/skills -mindepth 2 -maxdepth 2 -name SKILL.md
ls AGENTS.md 2>/dev/null
```

Diagnosis:
- missing `AGENTS.md` -> CRITICAL: workspace not registered for Copilot CLI.
- empty `.github/instructions/` -> WARN: no path-specific guidance.
- empty `.github/skills/` -> WARN: no callable skills.

### 3. Plugin package health

```bash
ls packages/copilot-cli-plugin/plugin.json 2>/dev/null
ls packages/copilot-cli-plugin/skills/ 2>/dev/null
ls packages/copilot-cli-plugin/agents/ 2>/dev/null
ls packages/copilot-cli-plugin/hooks.json 2>/dev/null
```

Diagnosis:
- missing `plugin.json` -> CRITICAL: plugin package not packaged.
- skills directory empty -> WARN: plugin route exposes no skills.

### 4. Hook and log directories

```bash
ls .copilot-hooks/ 2>/dev/null
ls .copilot-hooks/events.jsonl 2>/dev/null
ls .copilot-hooks/session.log 2>/dev/null
```

Diagnosis:
- `.copilot-hooks/` missing despite recent CLI sessions -> WARN: hooks not
  bootstrapped or `sessionStart` did not run.
- `.copilot-hooks/events.jsonl` empty after multiple sessions -> WARN: hook
  emission disabled.

### 5. Repo validation scripts

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/validate-release-readiness.sh
```

Treat any non-zero exit as a finding; quote the actual stderr line.

## Report format

```
## Copilot CLI Doctor Report

### Summary
[HEALTHY | ISSUES FOUND]

### Checks
| Check | Status | Details |
| --- | --- | --- |
| Copilot CLI binary | OK / WARN / CRITICAL | ... |
| Workspace registration | ... | ... |
| Plugin package | ... | ... |
| Hook directory | ... | ... |
| Validation scripts | ... | ... |

### Issues Found
1. ...

### Recommended Fixes
[concrete commands, no destructive action without user confirmation]
```

## Goal

- give the user a structured diagnosis with status per check;
- never apply destructive fixes silently — confirm before deleting plugin
  caches, hook directories, or registration files;
- prefer quoting the actual error line over restating it in prose;
- surface honest unknowns when a host-product command name cannot be
  verified against the user's installed CLI version.

## Stop conditions

- Stop after returning the report unless the user explicitly asks for the
  fixes to be applied.
- Stop and ask before any deletion under `.copilot-hooks/`, `.github/`,
  `packages/copilot-cli-plugin/`, or user-level Copilot CLI config.
