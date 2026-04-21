# Copilot State Contract

This document defines the local state-management rules that keep
`oh-my-copilot` trustworthy as a root workspace plus reusable plugin package.

## Canonical plugin source path

The installed Copilot plugin entry in `~/.copilot/config.json` must point at
the canonical root plugin directory:

- `packages/copilot-cli-plugin/`

It must **not** point at:

- `.omx/team/...`
- detached worker worktrees
- any other transient checkout

That matters because a transient team/worktree path can disappear after a team
run and silently leave local plugin state pointing at stale files.

## User-global vs project-local state

The current state model intentionally splits state by responsibility:

### User-global

- `~/.copilot/config.json`
- `~/.copilot/installed-plugins/`
- other Copilot session caches/state under `~/.copilot/`

These belong to the host product and the local machine.

### Project-local

- `.copilot-hooks/config.json`
- `.copilot-hooks/events.jsonl`
- `.copilot-hooks/session.log`
- `.copilot-hooks/tools.log`

These belong to the current repository root and must not be pooled across
projects.

## Why this is benchmark-relevant

For `oh-my-copilot`, state handling is part of the product proof:

- plugin install proof is only meaningful if the source path is canonical;
- hook evidence is only meaningful if the logs are project-local; and
- release validation should catch state drift before a release, not after.

## Local validation

Run:

```bash
./scripts/check-install-state.sh
./scripts/validate-copilot-state-contract.sh
```

Both are required for a strong local release check.
