# Hook surface (Copilot CLI v1.0.43)

This document records the lifecycle hook events GitHub Copilot CLI exposes to
plugins, which of them the omcp plugin currently wires, and which it leaves
available-but-unwired.

omcp wires **4** of Copilot CLI's lifecycle hook events today. Copilot CLI fires
more than four events — the plugin simply does not register a script for every
one yet. The event set below is taken from GitHub's official hooks
documentation:

- <https://docs.github.com/en/copilot/reference/hooks-configuration>
- <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks>

Hook configuration files use JSON `version: 1`.

## Events wired by omcp

These four are configured in `packages/copilot-cli-plugin/hooks.json`.

| Event | Fired | omcp script | Purpose in omcp |
|---|---|---|---|
| `sessionStart` | A new or resumed session begins | `scripts/log-session-start.sh` | Initialize hook event log; can later restore active state via `state_list_active` |
| `preToolUse` | Before each tool executes | `scripts/pre-tool-policy-gate.sh` | Policy gate hook; logs and can deny |
| `postToolUse` | After each tool completes successfully | `scripts/post-tool-audit.sh` | Audit log + parity-guard run; can later parse exit code and call `trace_write` on failure |
| `sessionEnd` | The session terminates | `scripts/session-end-audit.sh` | Final audit log; can later persist final state and run `notepad_prune` |

## Events Copilot CLI exposes but omcp does not yet wire

These events are fired by Copilot CLI per the official reference, but the plugin
does not currently register a script for them. They are **available for future
wiring**, not host-product limits.

| Event | Fired | Potential omcp use |
|---|---|---|
| `userPromptSubmitted` | The user submits a prompt | Capture the user turn directly instead of inferring it from the first `postToolUse` |
| `postToolUseFailure` | A tool completes with a failure | Dedicated failure path for `trace_write` instead of parsing exit code inside `postToolUse` |
| `preCompact` | Context compaction is about to begin (manual or automatic) | Persist durable state defensively before the context window is compacted |
| `agentStop` | The main agent finishes a turn | Turn-level bookkeeping / end-of-turn state flush |
| `subagentStart` | A subagent is spawned (before it runs) | Observe delegation boundaries for team/trace orchestration |
| `subagentStop` | A subagent completes | Reconcile subagent results into team/trace state |
| `errorOccurred` | An error occurs during execution | Record errors into the trace/audit log |
| `permissionRequest` | Before the permission service runs (programmatic approve/deny) | Policy-driven auto-approval/denial of tool execution |
| `notification` | The CLI emits a system notification (shell/agent completion, permission prompts, etc.) | Surface notifications to external integrations |

> Behavior note: for most events, non-zero exits and timeouts are logged and the
> agent continues. `preToolUse` is the exception — its errors, crashes, and
> timeouts **deny** the tool call rather than silently allowing it.

## Future expansion

To wire an additional event, register it in
`packages/copilot-cli-plugin/hooks.json` with a script and add a row to the
"Events wired by omcp" table above (moving it up from the unwired table). No
deeper integration is possible from a plugin until the host fires the event.
