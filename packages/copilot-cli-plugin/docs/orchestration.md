# oh-my-copilot — Orchestration

This document covers the 3-stage pipeline, the 8-tool MCP surface, slash
commands, hooks, resume semantics, and failure modes for the
`oh-my-copilot` Copilot CLI plugin.

Related: [state-management.md](state-management.md)

---

## What this plugin orchestrates

The plugin coordinates a **spec → plan → artifact** pipeline via an
orchestrator module backed by an 8-tool MCP server. Each stage is driven by
a dedicated skill, emits a file with provenance frontmatter, and records its
transition in `.omc/state/pipeline-state.json` so the chain is resumable and
inspectable at any point.

The three skills (`deep-interview`, `ralplan`, `autopilot`) are stateless
individually — shared state is the pipeline-state file and the provenance
frontmatter on every output file. The orchestrator only reads and writes state;
it does not call external services.

---

## The 3 stage skills

### Stage 1 — deep-interview (spec)

**Consumes:** a free-text idea or problem statement from the user.

**Produces:** `.omc/specs/deep-interview-<slug>.md` — a structured spec with
full provenance frontmatter.

**How it works:** The skill runs a Socratic question loop, gating on a
numerical ambiguity score. When the score drops below the configured threshold
the loop closes and the spec file is written. The slug is derived from the
first 5 words of the idea.

**Transition recorded:** `spec → plan` stub written to pipeline-state.json via
`mcp__omcp__pipeline_record_transition`.

### Stage 2 — ralplan (plan)

**Consumes:** the spec file at `.omc/specs/deep-interview-<slug>.md`.

**Produces:** `.omc/plans/<slug>-plan.md` — a consensus plan with full
provenance frontmatter.

**How it works:** Planner + Architect + Critic agents run a consensus loop
against the spec. The loop exits when all three agents agree or a maximum
iteration count is reached. The highest-scoring plan is written to disk.

**Transition recorded:** `plan → artifact` stub written to pipeline-state.json.

### Stage 3 — autopilot (artifact)

**Consumes:** the plan file at `.omc/plans/<slug>-plan.md`.

**Produces:** working code in the scratch directory, with a manifest at
`.omc/artifacts/<slug>-manifest.md` (`pipeline-stage: artifact`).

**How it works:** Autopilot runs parallel ralph + ultrawork loops, delegating
tasks from the plan to executor agents. Each loop reports completion status
back to the orchestrator. The artifact manifest is written when all tasks
reach the done state.

---

## Provenance frontmatter contract

Every file produced by a pipeline stage carries this frontmatter block:

```yaml
---
produced-by: <skill-name>         # deep-interview | ralplan | autopilot
produced-at: <ISO-8601 timestamp>
pipeline-stage: <stage>           # spec | plan | artifact
pipeline-slug: <slug>             # shared across all 3 stages for one run
---
```

Downstream stages read `pipeline-stage` to verify they are consuming the
correct output type. If the frontmatter is missing or the stage does not match,
the skill aborts with a clear error message rather than silently processing a
wrong file.

---

## Pipeline state file

`.omc/state/pipeline-state.json` holds the full chain for a run:

```json
{
  "slug": "<slug>",
  "started-at": "<ISO-8601>",
  "stages": {
    "spec":     { "status": "done",    "path": ".omc/specs/...",    "completed-at": "..." },
    "plan":     { "status": "done",    "path": ".omc/plans/...",    "completed-at": "..." },
    "artifact": { "status": "running", "path": ".omc/artifacts/...", "completed-at": null  }
  },
  "transitions": [
    { "from": "spec",  "to": "plan",     "recorded-at": "..." },
    { "from": "plan",  "to": "artifact", "recorded-at": "..." }
  ]
}
```

See [state-management.md](state-management.md) for the full schema, field
definitions, and versioning policy.

---

## MCP tool surface (8 tools)

| Tool | Signature | Role |
| --- | --- | --- |
| `read_file` | `(path: string) → string` | Read file contents from the project tree |
| `write_file` | `(path: string, content: string) → void` | Write or overwrite a file |
| `run_command` | `(cmd: string, cwd?: string) → {stdout, stderr, exit}` | Execute a shell command |
| `list_directory` | `(path: string) → string[]` | List directory contents |
| `search_files` | `(pattern: string, dir?: string) → match[]` | Search files by pattern or content |
| `get_diagnostics` | `(path: string) → diagnostic[]` | Return LSP-style diagnostics for a file |
| `pipeline_record_transition` | `(slug: string, from: stage, to: stage) → void` | Record a stage transition in pipeline-state.json |
| `pipeline_state` | `(slug: string) → PipelineState` | Read the current pipeline state for a slug |

The first 6 tools are the base MCP surface. The last 2 (`pipeline_record_transition`
and `pipeline_state`) are the pipeline-specific tools added in US-006.

MCP server source: `mcp-server/`. Build with `bash mcp-server/build.sh`.

---

## Slash commands

| Command | Wraps | Args |
| --- | --- | --- |
| `/deep-interview` | `skills/deep-interview/` | `"<idea or problem statement>"` — free text |
| `/ralplan` | `skills/ralplan/` | optional `--spec <path>` to override spec file |
| `/autopilot` | `skills/autopilot/` | optional `--plan <path>` to override plan file |
| `/ralph` | `skills/ralph/` | `"<task>"` — single ralph loop without pipeline tracking |
| `/team` | `skills/team/` | `"<task>"` — N coordinated agents on shared task list |

---

## Hooks

| Event | Script | What it does |
| --- | --- | --- |
| `sessionStart` | `hooks/session-start.sh` | Bootstraps `.copilot-hooks/config.json` if missing; writes session-start event to `events.jsonl` |
| `preToolUse` | `hooks/pre-tool-use.sh` | Policy gate — checks tool call against `scripts/policy-patterns.txt`; blocks and logs if a pattern matches |
| `postToolUse` | `hooks/post-tool-use.sh` | Appends structured event to `events.jsonl` with tool name, args summary, and exit status |
| `sessionStop` | `hooks/session-stop.sh` | Writes human-readable session summary to `session.log`; flushes any pending pipeline state |

---

## End-to-end example

```bash
# 1. Install the plugin and build the MCP server
copilot plugin install /path/to/oh-my-copilot/packages/copilot-cli-plugin
bash packages/copilot-cli-plugin/mcp-server/build.sh

# 2. Start a Copilot CLI session and run the pipeline
/deep-interview "build me a CLI that watches markdown files and hot-reloads a preview"
# → plugin asks clarifying questions, writes .omc/specs/deep-interview-build-me-a-cli.md
# → records spec→plan transition in .omc/state/pipeline-state.json

/ralplan
# → Planner + Architect + Critic consensus loop
# → writes .omc/plans/build-me-a-cli-plan.md
# → records plan→artifact transition

/autopilot
# → parallel ralph + ultrawork execution
# → produces working code in scratch dir
# → writes .omc/artifacts/build-me-a-cli-manifest.md
```

After all three stages complete, `.omc/state/pipeline-state.json` shows all
three stages as `"status": "done"`.

---

## Reading the state mid-run

At any point during a pipeline run you can inspect the current state:

```bash
# Via MCP tool (inside a Copilot CLI session)
mcp__omcp__pipeline_state "build-me-a-cli"

# Or read the file directly
cat .omc/state/pipeline-state.json
```

The `stages` object shows which stages are `done`, `running`, or `pending`.
The `transitions` array shows the recorded handoffs with timestamps.

---

## Resume semantics

If Copilot CLI exits mid-pipeline (crash, timeout, user interrupt), the
pipeline-state.json file persists on disk. The next session can resume from
the last completed stage:

- If `spec` is `done` and `plan` is `pending`, run `/ralplan` directly.
- If `plan` is `done` and `artifact` is `pending`, run `/autopilot` directly.
- Each skill reads pipeline-state.json on startup and skips stages already
  marked `done`.

No data is lost. The spec and plan files on disk are the source of truth;
pipeline-state.json is derived from them and can be reconstructed by re-running
`mcp__omcp__pipeline_record_transition` for each completed stage.

---

## Failure modes

**Stage tool call fails (e.g. `write_file` returns an error):**
The orchestrator catches the error, leaves the transition un-recorded, and
returns a user-visible error message. The pipeline-state.json is NOT updated
for the failed transition — the stage remains `running` (or reverts to its
pre-call status). Re-running the same skill safely retries from the beginning
of that stage.

**Consensus loop in ralplan does not converge:**
After the maximum iteration count the highest-scoring plan is written and the
transition is recorded. A warning is appended to the plan frontmatter:
`consensus-warning: max-iterations-reached`.

**Autopilot task left incomplete:**
Individual task failures within autopilot are logged to the artifact manifest
under `failed-tasks`. The overall stage is still marked `done` if the majority
of tasks succeeded. Retry by re-running `/autopilot --plan <path>`.

**pipeline-state.json is corrupted or missing:**
Each skill gracefully degrades: it writes its output file and emits a warning
that the state could not be updated. The user can manually recreate the state
file or ignore it — the output files are the authoritative artifacts.
