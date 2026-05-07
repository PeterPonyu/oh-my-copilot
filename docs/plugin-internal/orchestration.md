# omcp — Orchestration

This is the runtime usage doc for the **omcp** Copilot CLI plugin. It covers
the 3-stage pipeline, the 8-tool MCP surface, the 5 slash commands, the 4 hook
events, and the resume + failure semantics.

Related: [state-management.md](state-management.md) for the pipeline-state
schema, read/write paths, concurrency model, and examples.

---

## What this plugin orchestrates

The plugin coordinates a **spec → plan → artifact** pipeline through three
stage skills, an orchestrator module, and an 8-tool MCP server. Each stage
writes a file with provenance frontmatter and records its transition in
`.omcp/state/pipeline-state.json` so the chain is resumable and inspectable
at any point.

The three stage skills (`deep-interview`, `ralplan`, `autopilot`) are
stateless individually. Shared state is the pipeline-state file plus the
provenance frontmatter on every output file. The orchestrator only reads and
writes state; it does not call external services.

---

## The 3 stage skills

### Stage 1 — deep-interview (spec)

- **Consumes:** a free-text idea or problem statement from the user.
- **Produces:** `.omcp/specs/deep-interview-<slug>.md` — a structured spec
  with provenance frontmatter.
- **How it works:** Socratic question loop, gated on a numerical ambiguity
  score. The loop closes and the spec file is written when ambiguity drops
  below the configured threshold.
- **Transition recorded:** `null → spec` via
  `mcp__omcp__pipeline_record_transition`.

### Stage 2 — ralplan (plan)

- **Consumes:** the spec written by deep-interview.
- **Produces:** `.omcp/plans/<slug>-plan.md` — a consensus plan with
  provenance frontmatter.
- **How it works:** Planner + Architect + Critic agents run a consensus
  loop against the spec. Loop exits when all three approve or a max
  iteration count is reached.
- **Transition recorded:** `spec → plan`.

### Stage 3 — autopilot (artifact)

- **Consumes:** the plan written by ralplan.
- **Produces:** working code in the project tree, with a manifest at
  `.omcp/artifacts/<slug>-manifest.md`.
- **How it works:** parallel ralph + ultrawork loops, delegating tasks
  from the plan to executor agents.
- **Transition recorded:** `plan → artifact`.

---

## Provenance frontmatter contract

Every file produced by a pipeline stage carries this block:

```yaml
---
produced-by: <skill-name>         # deep-interview | ralplan | autopilot
produced-at: <ISO-8601 timestamp>
pipeline-stage: <stage>           # spec | plan | artifact
---
```

Downstream stages read `pipeline-stage` to verify they are consuming the
correct output type. If the frontmatter is missing or the stage does not
match, the skill aborts with a clear error rather than silently processing
a wrong file.

---

## MCP tool surface (8 tools)

Server name: `omcp` (from `.mcp.json`). Tools appear to the model as
`mcp__omcp__<tool>`. Source code: `mcp-server/server.mjs`. Build runtime
deps with `bash mcp-server/build.sh`.

| Tool | Inputs | Output | Role |
|---|---|---|---|
| `state_read` | `key: string` | `{ value: any \| null, exists: bool }` | Read JSON from `.omcp/state/<key>.json` |
| `state_write` | `key: string, value: any` | `{ ok: bool, path: string }` | Atomic write (temp file + rename) to `.omcp/state/<key>.json` |
| `state_list` | — | `{ keys: string[] }` | List every JSON key currently in `.omcp/state/` |
| `notepad_read` | `tail?: number` | `{ content: string }` | Read `.omcp/notepad.md` (optionally last N lines) |
| `notepad_write` | `entry: string, priority?: "manual"\|"working"\|"priority"` | `{ ok: bool }` | Append a timestamped entry to `.omcp/notepad.md` |
| `plan_list` | — | `{ plans: { path, slug, title }[] }` | Enumerate `.omcp/plans/*.md` |
| `pipeline_record_transition` | `from: string\|null, to: string, artifact_path: string` | `{ ok: bool, recorded_at: string }` | Append a transition to `.omcp/state/pipeline-state.json` |
| `pipeline_state` | — | `{ stages: [...], transitions: [...] }` | Read the current pipeline state |

Notes:
- `state_*` keys are JSON filenames; `..`, `/`, and leading-dot keys are
  rejected to prevent path traversal.
- `pipeline_record_transition` calls `orchestrator.mjs::transitionRecord`
  internally and writes through the same atomic temp-file-then-rename path.
- `pipeline_state` takes no arguments — it always reads the single state
  file at `.omcp/state/pipeline-state.json`.

---

## Slash commands (5)

Copilot CLI namespaces every plugin command. Type the namespaced form:

| Command | Wraps | Argument hint |
|---|---|---|
| `/omcp:deep-interview` | `skills/deep-interview/` | `<vague-idea>` |
| `/omcp:ralplan` | `skills/ralplan/` | `[--deliberate] <goal>` |
| `/omcp:autopilot` | `skills/autopilot/` | `<plan-or-goal>` |
| `/omcp:ralph` | `skills/ralph/` | `<task>` (single ralph loop, no pipeline tracking) |
| `/omcp:team` | `skills/team/` | `<n> <task>` (N coordinated agents) |

Each command file has a 4-field YAML frontmatter (`name`, `description`,
`agent`, `argument-hint`). The `agent:` field resolves within the omcp
plugin namespace, e.g. `agent: planner` resolves to
`agents/planner.agent.md`.

---

## Hooks (4 events)

Hook scripts live at `scripts/` (sibling of `mcp-server/`). All four
sourced from `.copilot-hooks/common.sh` for consistent stdin capture and
event-log emission.

| Event | Script | Timeout (s) | Purpose |
|---|---|---|---|
| `sessionStart` | `scripts/log-session-start.sh` | 5 | Append a `sessionStart` event to `.copilot-hooks/events.jsonl` and `session.log` |
| `preToolUse` | `scripts/pre-tool-policy-gate.sh` | 5 | Regex deny-list policy gate; reads `scripts/policy-patterns.txt`, blocks calls that match secret-leak / destructive-bash patterns |
| `postToolUse` | `scripts/post-tool-audit.sh` | 5 | Append a `postToolUse` event with tool name and exit context to `events.jsonl` and `tools.log` |
| `sessionEnd` | `scripts/session-end-audit.sh` | 5 | Append a closing `sessionEnd` event to `events.jsonl` and `session.log` |

The hook stdin contract is documented in `tools/omc-port/historical/wave-0-decisions.md` (Decision 1) — payload arrives as JSON on stdin via the
`copilot_hook_capture_stdin` helper.

---

## End-to-end example

Install:

```bash
copilot plugin install PeterPonyu/oh-my-copilot:packages/copilot-cli-plugin
bash ~/.copilot/installed-plugins/_direct/PeterPonyu--oh-my-copilot--packages-copilot-cli-plugin/mcp-server/build.sh
```

Run the pipeline (inside an interactive `copilot` session):

```text
/omcp:deep-interview "build me a CLI that watches markdown files and hot-reloads a preview"
# → asks Socratic clarifying questions, writes
#   .omcp/specs/deep-interview-build-me-a-cli.md
# → records null→spec transition in .omcp/state/pipeline-state.json

/omcp:ralplan
# → Planner + Architect + Critic consensus loop reads the spec
# → writes .omcp/plans/build-me-a-cli-plan.md
# → records spec→plan transition

/omcp:autopilot
# → parallel ralph + ultrawork execution against the plan
# → produces working code in the project tree
# → writes .omcp/artifacts/build-me-a-cli-manifest.md
# → records plan→artifact transition
```

After all three stages complete, `.omcp/state/pipeline-state.json`
shows three completed stages and three transitions.

---

## Reading state mid-run

```text
# Inside a Copilot CLI session, the model can call:
mcp__omcp__pipeline_state          # no args, reads .omcp/state/pipeline-state.json
mcp__omcp__state_list              # all state keys
mcp__omcp__plan_list               # all plans

# From a shell:
cat .omcp/state/pipeline-state.json | jq .
```

The `stages[]` array shows which stages have completed (and where their
artifacts live). The `transitions[]` array shows the recorded handoffs in
order with timestamps. See [state-management.md](state-management.md)
for the full schema.

---

## Resume semantics

If Copilot CLI exits mid-pipeline (crash, timeout, user interrupt), the
pipeline-state file persists on disk. The next session resumes from the
last completed stage:

- If `spec` is recorded but `plan` is not, run `/omcp:ralplan` directly.
- If `plan` is recorded but `artifact` is not, run `/omcp:autopilot`
  directly.
- Each stage skill reads pipeline-state.json on startup and skips
  transitions already recorded.

The spec, plan, and artifact files on disk are the source of truth.
The pipeline-state file is derived from them and can be reconstructed
by re-running `pipeline_record_transition` for each completed stage.

---

## Failure modes

**Stage tool call fails (e.g. `state_write` returns an error):**
The orchestrator catches the error and leaves the transition un-recorded.
The pipeline-state file is NOT updated. Re-running the same skill safely
retries from the beginning of that stage.

**Consensus loop in ralplan does not converge:**
After the maximum iteration count, the highest-scoring plan is written
and the transition is recorded. A warning is appended to the plan
frontmatter: `consensus-warning: max-iterations-reached`.

**Autopilot task left incomplete:**
Individual task failures within autopilot are logged to the artifact
manifest under `failed-tasks`. The overall stage is still marked
recorded if the majority of tasks succeeded. Retry by re-running
`/omcp:autopilot` (it picks up incomplete tasks from the plan).

**`pipeline-state.json` is corrupted or missing:**
Each skill gracefully degrades: it writes its output file and emits a
warning that the state could not be updated. The output files are
authoritative; the state file is regenerated on the next successful
transition record.

**preToolUse policy gate blocks a legitimate call:**
The gate's regex deny-list lives at `scripts/policy-patterns.txt`. Edit
to remove or refine the offending pattern. Documented limitations:
variable indirection (`$CRED`), base64-decoded payloads, and
`eval`-wrapped strings are not detected by the regex-only filter.

---

## See also

- [state-management.md](state-management.md) — schema, read/write paths, concurrency
- `../mcp-server/README.md` — MCP server installation and tool reference
- `../README.md` — plugin overview and quick walkthrough
- `../../../tools/omc-port/dispatch-contract.md` — translator contract for porting OMC skills (dev-only)
