# Runtime Proof Checklist

Use this checklist to prove the workspace is doing more than just loading files.

## 1. Open the correct workspace root

Open this folder itself in VS Code:

```text
/home/zeyufu/Desktop/oh-my-copilot/examples/vscode-copilot-layout
```

If you open the repo root instead, the workspace-local `.github` and `AGENTS.md`
surfaces in this example are not the active root-level customizations.

## 2. Confirm agent mode is actually available

Before blaming the `.agent.md` files, confirm the product surface exists:

- the Chat view shows an **Agent** option in the agent picker;
- `/agents` opens the custom-agent menu; and
- the Chat Customizations editor can see `.github/agents`.

If Agent mode itself is missing, the workspace cannot prove handoffs. In current
VS Code, this usually means `chat.agent.enabled` is disabled or managed off by
organization policy.

## 3. Prove custom-agent discovery

In Agent mode, confirm these agents are visible:

- `planner`
- `implementer`
- `reviewer`
- `verifier`

Then select `planner` and send:

```text
Plan a one-line README wording change, but do not edit files.
```

Expected result:

- the response reflects the planner role; and
- you see handoff options for `Draft it` and `Review the plan`.

## 4. Prove one handoff actually executes

Click one planner handoff:

- `Draft it` should move to `implementer`
- `Review the plan` should move to `reviewer`

Expected result:

- the next turn is routed to the target agent; and
- the prefilled prompt matches the handoff declared in
  `.github/agents/planner.agent.md`.

If the planner answer appears but the handoff buttons do not, the agent file may
be loaded while handoff UI is not active in that VS Code build or session.

## 5. Prove hook execution

Remove stale logs first:

```bash
rm -f .copilot-hooks/session.log .copilot-hooks/tools.log .copilot-hooks/warnings.log
```

Then, in Agent mode, trigger one real tool-using turn. A simple example:

```text
Inspect src/sample.ts and summarize what it does.
```

Expected result:

- `.copilot-hooks/session.log` is created or appended;
- `.copilot-hooks/tools.log` is created or appended after tool use; and
- the GitHub Copilot Chat Hooks output channel shows the hook run.

If `session.log` is still missing after the first Agent-mode prompt, or
`tools.log` is still missing after visible tool activity, treat hooks as
**not proven** for that VS Code session.

## 6. Interpret failures correctly

- Instructions work, but agents do not appear:
  likely Agent mode is unavailable or `.github/agents` is not being loaded.
- Agents appear, but handoffs do not:
  custom agents are partly proven; handoff UI is not yet proven.
- Hooks never log:
  check the Chat Hooks output channel and whether hooks are disabled by policy
  (`chat.useHooks`).

This file is a runtime checklist, not a claim that your local VS Code build will
always support every surface the same way.
