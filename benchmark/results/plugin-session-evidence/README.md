# Plugin session evidence (maintainer attachments)

This directory is the **canonical location** for optional, release-attached proof
that Copilot CLI loaded this repository’s plugin hooks and surfaces after a local
install.

## What to capture

After `copilot plugin install …/packages/copilot-cli-plugin` (see
[`docs/installation.md`](../../../docs/installation.md)):

1. **Hook audit trail** — lines from `.copilot-hooks/session.log` or
   `.copilot-hooks/events.jsonl` showing events with `source=plugin` once the
   plugin hooks have run in a session (timestamps and cwd may be redacted).
2. **Discovery sanity** — short transcript showing `/skills list` (or the current
   Copilot CLI equivalent) including plugin-backed skill names, or a constrained
   agent invocation using the namespaced agent id
   `oh-my-copilot-power-pack:*`.

Redact secrets, tokens, proprietary paths, and customer identifiers before committing
or pasting into release notes.

## Naming

Prefer immutable filenames tied to the release or PR, for example:

- `oh-my-copilot-<version>-plugin-hooks-redacted.log`
- `oh-my-copilot-<version>-skills-discovery.txt`

## Policy

- Nothing here is required for local development.
- Checked-in samples must be **explicitly labeled** as redacted maintainer evidence.
- Do not stage writable `.copilot-hooks/config.json` churn from this folder;
  follow `docs/release-checklist.md` §5 regarding ignored hook state.
