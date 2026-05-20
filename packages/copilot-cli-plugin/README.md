# [OMCP] oh-my-copilot CLI Plugin

## Quick walkthrough — spec → plan → working code

This plugin wires three orchestration skills into an end-to-end pipeline. Here
is a concrete run from idea to artifact.

**Stage 1 — Spec (deep-interview)**

```text
/omcp:deep-interview "build me a CLI that watches markdown files and hot-reloads a preview"
```

The plugin asks Socratic clarifying questions until ambiguity drops below the
gate threshold, then writes the agreed spec to
`.omcp/specs/deep-interview-<slug>.md` with frontmatter:

```yaml
produced-by: deep-interview
produced-at: 2026-05-06T10:00:00Z
pipeline-stage: spec
```

The skill records the spec→plan transition stub via
`mcp__omcp__pipeline_record_transition`. State is flushed to
`.omcp/state/pipeline-state.json`.

**Stage 2 — Plan (ralplan)**

```text
/omcp:ralplan
```

Planner + Architect + Critic run a consensus loop against the spec. The
agreed plan is written to `.omcp/plans/<slug>-plan.md` (`pipeline-stage: plan`).
`mcp__omcp__pipeline_record_transition` records the plan→artifact
transition. `mcp__omcp__pipeline_state` reads the current chain.

**Stage 3 — Artifact (autopilot)**

```text
/omcp:autopilot
```

Autopilot executes parallel ralph + ultrawork loops until working code lands
in the scratch directory (`pipeline-stage: artifact`). The full chain is
visible in `.omcp/state/pipeline-state.json` at any point during execution.

**Install and build**

```bash
copilot plugin install /path/to/oh-my-copilot/packages/copilot-cli-plugin
bash packages/copilot-cli-plugin/mcp-server/build.sh
```

See [`docs/plugin-internal/orchestration.md`](../../docs/plugin-internal/orchestration.md)
for the full MCP tool surface, hook events, resume semantics, and failure modes.
See [`docs/plugin-internal/state-management.md`](../../docs/plugin-internal/state-management.md)
for the `pipeline-state.json` schema.

When using the installed plugin inside a Copilot CLI session, invoke plugin
slash commands in their namespaced form (for example `/omcp:ralplan`) as the
command itself, not as trailing text in a longer sentence.

---

This package is an **experimental local Copilot CLI plugin** for turning parts
of the research repo into reusable Copilot CLI power surfaces.

It is still intentionally bounded:

- no tmux worker runtime
- no separate memory subsystem
- Copilot cloud agent, IDE integrations, and SDK runtimes are out of scope

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
copilot --agent 'omcp:reviewer' -p "Review this repo" -s --model auto --allow-all
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

## Plugin inventory

| Dimension | Count |
| --- | --- |
| Agents | 21 |
| Skills | 42 |
| Slash commands | 41 |
| Hook events | 4 |
| MCP server tools | 35 |
