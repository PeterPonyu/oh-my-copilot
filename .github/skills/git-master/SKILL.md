---
name: git-master
description: "[OMCP] Atomic commits, safe rebases, and history management with project commit-style detection"
orchestrates-agents: "git-master"
---

# [OMCP] Git Master

Use this skill for git work that should land as clean, atomic, style-matched
history: splitting a sprawling working tree into focused commits, rebasing a
feature branch, archaeology over history, or branch hygiene.

## Agent orchestration

This skill delegates to the `git-master` agent, which detects the project's
commit-message style (language, format, scope) before writing any commit.

## When to use

- "commit this", "split this into atomic commits"
- "rebase onto main", "tidy up these commits"
- "find the commit that introduced X", `git blame`/`git bisect` style work
- Branch cleanup, stale branch pruning, worktree management

## When not to use

- The user just wants you to *push code*, not orchestrate history (do it
  directly).
- The change is a single small file and the message is obvious (commit
  directly, no skill needed).
- The user explicitly asked for `--no-verify`, force-push to main, or
  destructive operations without context — surface the risk first.

## Run

1. **Detect style first.** Read the last 20-30 commit messages:
   ```bash
   git log -30 --pretty=format:'%h %s'
   ```
   Note language (English/Korean/Chinese/etc.), format (semantic
   `feat(scope):` vs plain vs short), typical body length, and trailer
   conventions.
2. **Map changes to concerns.** `git status --short` + `git diff --stat`.
   Group files by directory, module, or change kind. Different concerns =
   different commits.
3. **Sequence commits** so each one can be reverted independently without
   breaking the build.
4. **Write style-matched messages**: imperative mood by default, but always
   defer to detected project style.
5. **Stage and commit one concern at a time** with explicit `git add <files>`
   — never blanket `git add -A` unless the working tree is already curated.
6. **For rebases**: stash dirty files, never rebase shared branches, always
   use `--force-with-lease` over `--force`, never `--force` on
   `main`/`master`.
7. **Verify** with `git log --oneline -N` and (if a test suite is fast) a
   green build at the tip.

## Hard constraints

- Never `--no-verify` unless the user explicitly asked for it.
- Never amend a pushed commit unless the user explicitly asked.
- Never destructive (`reset --hard`, `branch -D`, `clean -f`,
  `checkout .`) without confirmation.
- Never force-push to `main`/`master`.
- Plan/spec files (`docs/plans/*.md`, `docs/specs/*.md`) are READ-ONLY in
  this skill — do not rewrite them as part of history cleanup.

## Output format

```
Detected style: language=<...>, format=<...>, examples=<2-3 subject lines>
Concerns identified: <N>
  1. <concern> — files: ..., commit msg: "<subject>"
  2. ...
Commits created: <N>
Tip verification: git log output (N lines)
Notes / risks surfaced: <list or "none">
```

## Goal

- atomic commits that each do one thing;
- messages that match the project, not a generic template;
- safe history operations with explicit risk surfacing.
