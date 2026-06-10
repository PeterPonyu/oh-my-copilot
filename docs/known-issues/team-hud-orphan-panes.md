# Known Issue: Team mode degenerates into N stacked HUD panes (upstream: oh-my-codex)

**Status: OPEN — not yet fixed**
**Affects: the oh-my-codex (`omx` 0.18.7) tmux HUD/team runtime.** oh-my-copilot
ships no tmux/HUD runtime of its own — the bug was observed while running `omx`
team mode with this repository as the working directory, and is recorded here
for omcp users who hit it in that setup. No omcp code is implicated.
**First observed: with this repo checked out at `fa48811` (cwd only)**

## Summary

After several rounds of normal (non-team) chat, invoking **team mode** leaves the
tmux window filled with nothing but HUD strips. The leader REPL pane and all
worker panes are gone; every remaining pane runs `omx hud --watch`. The HUD pane
count grows monotonically and is never reaped.

Observed: **8 panes, all `omx hud --watch --preset=focused`, 0 leader, 0 workers.**

## Environment

| | |
|---|---|
| OMX / `oh-my-codex` | `0.18.7` |
| repo HEAD | `fa48811` |
| tmux | `3.4` |
| node | `v24.12.0` |
| OS | Ubuntu 24.04.4 LTS |

## Reproduction

1. Start `omx` inside a tmux session (single leader pane + bottom HUD strip — normal).
2. Have several normal conversation turns (`turns:` counter climbs).
3. Invoke **team mode**.
4. Window degenerates to a column of stacked HUD panes; leader/worker panes missing.

## Root Cause (two cooperating defects)

### D1 — Per-turn HUD reconcile never reaps dead-leader HUDs

`reconcileHudForPromptSubmit()` in oh-my-codex's `dist/hud/reconcile.js` dedups on
`leaderPaneId === currentPaneId`. Once the original leader pane (`%21`) is
destroyed, every subsequent reconcile call fails the owner match, creates a new
HUD instead of reaping the orphaned one, and never calls `reapDeadHudPanes()`.
The bootstrap path (oh-my-codex's `dist/cli/index.js` `inside-tmux` branch) does call
`reapDeadHudPanes()` — the two paths are asymmetric.

### D2 — `chooseTeamLeaderPaneId` can elect a HUD pane as the leader

When all panes in the window are HUD watchers (the D1 end-state),
`chooseTeamLeaderPaneId` returns a HUD `paneId` as the elected leader. Team setup
then builds its layout around a HUD pane with no real interactive leader ever
present. There is no guard for the "no non-HUD pane exists" case.

## Cascade

1. Normal chat: HUD dedup works (reconcile fires from stable leader pane `%21`).
2. Team mode invoked. During setup/teardown, leader pane `%21` is destroyed.
3. With `%21` dead but HUDs still tagged `leaderPaneId=%21`, each later
   `reconcileHudForPromptSubmit` appends a new HUD (D1).
4. `chooseTeamLeaderPaneId` keeps picking a HUD as leader (D2); the window
   cannot recover a real leader/worker topology.
5. Window → N stacked HUD strips, monotonically growing.

## Suggested Fixes

1. **Reap dead-leader HUDs in the per-turn path.** Call `reapDeadHudPanes()` at
   the top of `reconcileHudForPromptSubmit()` — same as the `inside-tmux` branch.
2. **Session-first dedup.** When `resolvedSessionId` is known, collapse all
   same-session HUD panes regardless of `leaderPaneId`, then keep one and re-tag.
3. **Hard cap**: never allow more than one owned HUD watcher per `(session,
   window)`. Kill extras at any reconcile.
4. **Guard `chooseTeamLeaderPaneId`**: if every candidate pane is a HUD watcher,
   fail fast with a clear error instead of returning a HUD `paneId`.
5. **Don't destroy the leader pane on team teardown/rollback**: audit
   `collectShutdownPaneIds` / `teardownWorkerPanes` to ensure the leader pane id
   is never included in the kill set.

## Recovery (for affected users)

```bash
# Kill all panes except the current one in the affected window
tmux kill-pane -a -t <window>
```

Then relaunch `omx` — the bootstrap path's `reapDeadHudPanes` will clean
dead-leader HUDs on next start.

## References

- Original forensic capture: `OMX_TEAM_HUD_ORPHAN_ISSUE.md` (untracked root file,
  preserved in the main checkout at the time of discovery)
- Source files implicated — all inside the **installed `oh-my-codex` package**
  (e.g. `<node prefix>/lib/node_modules/oh-my-codex/`), none of them in this
  repository: `dist/hud/reconcile.js`, `dist/hud/tmux.js`,
  `dist/team/tmux-session.js`, `dist/cli/index.js`
- Upstream: report/fix belongs in the `oh-my-codex` project; this doc exists so
  omcp users can recognize and recover from the failure mode.
