# Hook surface (Copilot CLI v1.0.42)

This document records the hook events Copilot CLI exposes to plugins as of
v1.0.42, what the omcp plugin uses each for, and which OMC hook events have no
Copilot CLI equivalent.

omcp does not promise OMC parity for hooks. The 4 events below are everything
Copilot CLI fires today; the additional OMC hook events are product-level
features outside the plugin layer.

## Events fired by Copilot CLI

| Event | Fired | omcp script | Purpose in omcp |
|---|---|---|---|
| `sessionStart` | Once at CLI start | `scripts/log-session-start.sh` | Initialize hook event log; can later restore active state via `state_list_active` |
| `preToolUse` | Before each tool call | `scripts/pre-tool-policy-gate.sh` | Policy gate hook; logs and can deny |
| `postToolUse` | After each tool call | `scripts/post-tool-audit.sh` | Audit log + parity-guard run; can later parse exit code and call `trace_write` on failure |
| `sessionEnd` | Once at CLI exit | `scripts/session-end-audit.sh` | Final audit log; can later persist final state and run `notepad_prune` |

These four are configured in `packages/copilot-cli-plugin/hooks.json`.

## OMC events without a Copilot CLI equivalent

These exist in oh-my-claudecode but have no fire path in Copilot CLI v1.0.42 —
they are host-product limits, not omcp porting omissions.

| OMC event | Why unavailable | Workaround |
|---|---|---|
| `UserPromptSubmit` | Copilot does not fire a hook on user message submit | Inspect last user turn from inside `postToolUse` after the first tool call (imperfect) |
| `PostToolUseFailure` | No separate failure event; failure is implicit in `postToolUse` envelope | Parse exit code / stderr inside `postToolUse` |
| `SubagentStart` / `SubagentStop` | Copilot's built-in delegation does not surface lifecycle events to plugins | None — plugins cannot observe subagent boundaries |
| `PreCompact` | No context-compaction hook | None — state must be persisted defensively in `postToolUse` |
| `PermissionRequest` | Permission system is internal to Copilot | None — plugins cannot intercept permission prompts |
| `Stop` | Same semantics as `sessionEnd` for omcp purposes | Use `sessionEnd` |

## Future expansion

When Copilot CLI exposes new hook events, register them in `hooks.json` and
add a row above. No deeper integration is possible from a plugin until the
host fires the event.
