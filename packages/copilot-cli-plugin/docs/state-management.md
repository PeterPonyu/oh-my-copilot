# Pipeline State Management

## Purpose

The pipeline state file provides durable orchestration state tracking for the
oh-my-copilot three-stage pipeline: `deep-interview` → `ralplan` → `autopilot`.
Because each stage may run in a separate Node process (or separate Copilot CLI
session), state must survive restarts and be readable by any stage without
in-memory coordination.

The state file records:

- Which **stages** have completed and where their output artifacts live.
- The ordered **transitions** that moved the pipeline from one stage to the next.

---

## File Location

```
.omc/state/pipeline-state.json
```

The path is workspace-relative. `stateDir` defaults to `.omc/state` in all
orchestrator functions. Pass an explicit `stateDir` when running tests or
operating on a non-default workspace root.

On first run the file does not exist. All readers treat a missing file as the
empty state `{ stages: [], transitions: [] }`.

---

## Schema

```json
{
  "stages": [
    {
      "name": "spec",
      "status": "completed",
      "artifact": "/abs/path/to/spec.md",
      "ts": "2026-05-06T10:00:00.000Z"
    },
    {
      "name": "plan",
      "status": "completed",
      "artifact": "/abs/path/to/plan.md",
      "ts": "2026-05-06T10:05:00.000Z"
    }
  ],
  "transitions": [
    { "from": null, "to": "spec", "ts": "2026-05-06T10:00:00.000Z" },
    { "from": "spec", "to": "plan", "ts": "2026-05-06T10:05:00.000Z" }
  ]
}
```

### stages[] field reference

| Field      | Type             | Description                                                         |
|------------|------------------|---------------------------------------------------------------------|
| `name`     | `string`         | Stage identifier. One of `"spec"`, `"plan"`, `"artifact"`.         |
| `status`   | `string`         | Always `"completed"` when written by `transitionRecord`.           |
| `artifact` | `string`         | Absolute (or relative) path to the output artifact of this stage.  |
| `ts`       | ISO 8601 string  | Wall-clock time when the transition was recorded.                   |

### transitions[] field reference

| Field  | Type             | Description                                                         |
|--------|------------------|---------------------------------------------------------------------|
| `from` | `string \| null` | Previous stage name, or `null` for the initial entry transition.   |
| `to`   | `string`         | Stage being entered.                                                |
| `ts`   | ISO 8601 string  | Wall-clock time when the transition was recorded.                   |

---

## Stage Lifecycle

The pipeline has four logical positions: `null` (not started) → `spec` →
`plan` → `artifact` → `null` (finished). Each stage skill writes exactly one
transition when it completes its work.

| Skill            | Transition recorded              | Artifact written             |
|------------------|----------------------------------|------------------------------|
| `deep-interview` | `{ from: null, to: "spec" }`     | Interview output / spec doc  |
| `ralplan`        | `{ from: "spec", to: "plan" }`   | Planning markdown             |
| `autopilot`      | `{ from: "plan", to: "artifact"}`| Final generated artifact     |

A skill should call `transitionRecord` only after its output artifact is
durably written to disk so that the state file never points to a missing file.

---

## Read Path

### Via MCP tool

```
mcp__oh-my-copilot__pipeline_state
```

The MCP server calls `readStage(stateDir)` and returns the parsed object.
No arguments are required when the default `.omc/state` directory is used.

### Via orchestrator directly

```javascript
import { readStage } from './orchestrator.mjs';

const state = readStage();                    // uses default .omc/state
const state2 = readStage('/custom/dir');      // explicit directory
// state = { stages: [...], transitions: [...] }
```

`readStage` never throws. If the file is absent or unparseable it returns
`{ stages: [], transitions: [] }`.

---

## Write Path

### Via MCP tool

```
mcp__oh-my-copilot__pipeline_record_transition
```

Arguments: `{ from, to, artifact, stateDir? }`.

### Via orchestrator directly

```javascript
import { transitionRecord } from './orchestrator.mjs';

transitionRecord({
  from: null,
  to: 'spec',
  artifact: '/workspace/.omc/artifacts/spec.md',
});

transitionRecord({
  from: 'spec',
  to: 'plan',
  artifact: '/workspace/.omc/artifacts/plan.md',
});
```

Internally `transitionRecord`:

1. Calls `readStage` to load current state (or gets empty shell).
2. Appends a new entry to `transitions[]`.
3. Upserts (insert-or-replace by `name`) into `stages[]`.
4. Serializes the updated state to a temp file (`pipeline-state.<hex>.tmp`).
5. Renames the temp file over the destination atomically.

The atomic temp-file + rename pattern means a reader always sees either the
old complete state or the new complete state — never a partial write.

---

## Cross-Session Persistence

State is stored on disk, not in memory. The file persists across:

- Copilot CLI restarts.
- Separate `node` invocations.
- Host shell session restarts (as long as the workspace directory is preserved).

Any process that can read `.omc/state/pipeline-state.json` can resume the
pipeline from the last recorded transition without any handshake with the
process that wrote the state.

---

## Concurrency Model

**Single writer**: `transitionRecord` is designed for a single writer at a
time. The atomic rename prevents torn reads but does not prevent lost updates
when two writers race:

```
Writer A reads state (2 transitions)
Writer B reads state (2 transitions)
Writer A writes state (3 transitions) ← rename succeeds
Writer B writes state (3 transitions) ← overwrites A's write; A's transition is lost
```

**Multi-writer behavior is undefined.** The pipeline stages run sequentially
by design, so this is not expected in normal use. If future changes introduce
concurrent stage execution, add an external lock (e.g. `lockfile`) before
calling `transitionRecord`.

---

## Backwards Compatibility

- **Missing file**: treated as `{ stages: [], transitions: [] }`. Safe on first run.
- **Missing fields**: `readStage` wraps both arrays with `Array.isArray` guards,
  so a hand-edited or partially written file degrades gracefully.
- **Extra fields**: unknown top-level keys are preserved through read → write
  cycles because the file is parsed as a plain object and re-serialized.

Do not remove the `stages` or `transitions` keys from the schema; downstream
consumers depend on both arrays being present (even if empty).

---

## Examples

### Record the first transition (spec stage completes)

```javascript
import { transitionRecord } from './orchestrator.mjs';

transitionRecord({
  from: null,
  to: 'spec',
  artifact: '.omc/artifacts/spec.md',
});
```

### Record subsequent transitions

```javascript
transitionRecord({ from: 'spec',   to: 'plan',     artifact: '.omc/artifacts/plan.md' });
transitionRecord({ from: 'plan',   to: 'artifact', artifact: '.omc/artifacts/output.md' });
```

### Read current pipeline state

```javascript
import { readStage, nextStage } from './orchestrator.mjs';

const { stages, transitions } = readStage();

const lastTransition = transitions.at(-1);
const currentStage   = lastTransition?.to ?? null;
const upcoming       = nextStage(currentStage);

console.log(`Completed stages: ${stages.map(s => s.name).join(', ')}`);
console.log(`Next stage: ${upcoming ?? '(pipeline complete)'}`);
```

### Inspect state from shell

```sh
cat .omc/state/pipeline-state.json | node -e "
  const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  console.log('stages:',      d.stages.map(s => s.name));
  console.log('transitions:', d.transitions.length);
"
```
