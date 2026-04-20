# oh-my-copilot CLI Plugin

This package is an **experimental local Copilot CLI plugin** for turning parts
of the research repo into reusable Copilot CLI power surfaces.

It bundles:

- custom agents
- reusable skills with shell scripts
- lightweight hooks

It is still intentionally bounded:

- no tmux worker runtime
- no OMC/OMX parity claim
- no separate memory subsystem

## Suggested local test

From a machine with GitHub Copilot CLI installed, install from this local path
using the current plugin command flow documented by GitHub.

Then verify:

- the custom agents load
- the skills appear in `/skills list`
- the hook file loads without errors
- the parity guard and docs-ship skills can run in a docs-heavy repository

## Practical verification notes

At the time this repo was tested, direct local install wrote plugin metadata to
`~/.copilot/config.json` and cached the plugin under
`~/.copilot/installed-plugins/_direct/...`.

That means the strongest proof of installation is:

1. `~/.copilot/config.json` contains the plugin entry
2. the plugin directory exists under `~/.copilot/installed-plugins/_direct/`
3. a Copilot CLI session can see the plugin-provided skills

Do not rely on `copilot plugin list` alone as the sole proof of installation.

## Agent naming rule

Plugin-provided agents are namespaced. For example:

```bash
copilot --agent 'oh-my-copilot-power-pack:reviewer' -p "Review this repo" -s --model auto --allow-all
```

Bare names such as `reviewer` are better reserved for root-local workspace
aliases.

## Hook and log policy

Plugin hooks follow the same per-project logging contract as the root
workspace:

- create `.copilot-hooks/config.json` only if it is missing
- append structured events to `.copilot-hooks/events.jsonl`
- keep `.copilot-hooks/session.log` and `.copilot-hooks/tools.log`
  human-readable

This keeps logs separated by project root and makes plugin behavior easier to
audit across repositories.
