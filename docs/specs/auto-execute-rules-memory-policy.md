# [OMCP] Rules and memory policy spec

## Goal

Make rules and memory first-class in `oh-my-copilot`, with the same level of
attention previously given to agents, skills, MCP, and hooks.

The guiding product idea is:

> Skills are not mainly professional-knowledge bundles. They are portable agent
> execution protocols: procedure, context compression, tool contracts, failure
> handling, and orchestration policy. Rules and memory are the long-lived
> constraints and preferences that keep those protocols stable across sessions.

## Reference evidence

Latest fetched snapshots used for this work:

- `oh-my-openagent`: `upstream/dev` at `330e437f`, exported to
  `/tmp/omcp-reference-latest-20260520050344/openagent`.
- `oh-my-codex`: `origin/main` at `6d438dac`, exported to
  `/tmp/omcp-reference-latest-20260520050344/codex`.
- `oh-my-claudecode`: `origin/main` / `v4.14.1` at `1fe17f0e`, exported to
  `/tmp/omcp-reference-latest-20260520050344/claudecode`.

Patterns learned:

- OpenAgent treats rules as lazy, file-touch context: rule files are discovered
  near the accessed path, matched by frontmatter globs, deduplicated by realpath
  and content hash, and surfaced as `[Rule: ...]` blocks. It also separates
  module orientation (`AGENTS.md`) from enforceable rule files.
- Codex keeps memory/wiki CLI-first. Its `AGENTS.md` overlay is bounded and
  marker-managed, pulling active mode state, priority notepad, project memory,
  compacting instructions, and wiki guidance without relying on vector search.
- ClaudeCode combines both: `.claude/rules`, `.github/instructions`,
  `.cursor/rules`, and user rules are discovered after file tools; project memory
  auto-detects environment context; notepad and project memory are exposed as MCP
  tools; pre-compact hooks preserve durable state.

## Existing OMCP baseline

`packages/copilot-cli-plugin/` already has useful memory primitives:

- `.omcp/notepad.md` with manual, working, and priority lanes.
- `.omcp/project-memory.json` with notes, directives, and facts.
- `.omcp/wiki/` with keyword/tag wiki tools and MCP resources.
- `.omcp/shared-memory/` for agent coordination channels.
- Hook logging under `.copilot-hooks/`.

The gap is that rules are not yet an explicit, queryable, testable policy layer.
The plugin can store directives, but it does not discover project rule files,
does not create pending context when a file path is touched, and does not explain
how rules, memory, wiki, notepad, and skills should interact.

## Desired policy model

OMCP should define the policy surfaces this way:

- **Role**: who the agent is.
- **Skill**: how the agent acts for a task class.
- **Tool/MCP**: what external capability the agent can use.
- **Rules**: long-lived behavioral constraints tied to files, repos, teams, or
  hosts.
- **Memory**: durable and temporary knowledge captured across turns/sessions.

Rules and memory must be scoped:

- Repository rules live in `.omcp/rules/`, `.github/instructions/`,
  `.github/copilot-instructions.md`, `.cursor/rules/`, or `.claude/rules/`.
- User-level rules may live in `~/.config/oh-my-copilot/rules/`.
- Temporary active context belongs in `.omcp/notepad.md`.
- Durable project facts/directives belong in `.omcp/project-memory.json`.
- Reviewable compound knowledge belongs in `.omcp/wiki/`.
- Agent coordination belongs in `.omcp/shared-memory/`.

## Acceptance criteria

- Add a rules discovery engine with no new dependencies.
- Discover `.omcp/rules`, `.github/instructions`, `.github/copilot-instructions.md`,
  `.cursor/rules`, `.claude/rules`, and user rules.
- Support YAML-style frontmatter keys `globs`, `alwaysApply`, and `description`
  using a conservative parser.
- Match rules lazily against touched file paths, dedupe per session by realpath
  and content hash, and store pending rule context in `.omcp/state/rules-pending.json`.
- Expose MCP tools for rule lookup, pending rule reads/clears, and a policy
  report.
- Expose MCP resources for pending rule context and the policy report.
- Extend the post-tool hook to capture pending rules on file-touch tool events
  without breaking sessions when parsing fails.
- Add canonical instruction documentation that explains the OMCP memory/rules
  policy and mirror it into root `.github/instructions/`.
- Add focused tests for discovery, matching, pending-context storage, resources,
  and MCP integration.
- Run the repo validation suite relevant to plugin behavior, mirrors, docs,
  power surfaces, root Copilot surfaces, and MCP server tests.

## Non-goals

- Do not implement a full OpenAgent boulder/Atlas runtime.
- Do not introduce vector embeddings for wiki or memory.
- Do not claim Copilot CLI supports hook output context injection unless this
  repo has evidence. Pending rules are exposed via MCP resources/tools instead.
- Do not replace existing notepad, project memory, wiki, or shared-memory stores.
- Do not commit, publish, or deploy automatically.
