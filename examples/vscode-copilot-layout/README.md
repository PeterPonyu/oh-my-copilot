# VS Code Copilot Power Workspace

This workspace is a **real smoke-test target** for current GitHub Copilot in
VS Code.

## Where things live

This repo keeps the workspace wiring small and explicit:

- `AGENTS.md` describes the overall workspace rules and intent.
- `.github/copilot-instructions.md` provides the always-on Copilot guidance.
- `.github/instructions/typescript.instructions.md` applies to `*.ts` and
  `*.tsx` files.
- `.github/agents/*.agent.md` defines the planner, reviewer, implementer, and
  verifier roles.
- `.github/prompts/*.prompt.md` contains opt-in workflow prompts such as
  `ship-docs` and `review-scope`.
- `.github/skills/**/SKILL.md` provides verification helpers like
  `docs-ship` and `parity-guard`.
- `.github/hooks/hooks.json` wires the hook behavior used by the workspace.

It is still bounded:

- it is not a production orchestration framework;
- it does not claim parity with `oh-my-claudecode` or `oh-my-codex`; and
- it focuses on **custom instructions, custom agents, prompt files, skills, and hooks**
  that VS Code Copilot can load today.

Open this folder itself as the VS Code workspace root:

```text
/home/zeyufu/Desktop/oh-my-copilot/examples/vscode-copilot-layout
```

Then test:

- instruction loading
- custom agent discovery
- handoff flow between agents
- prompt-file invocation
- skill invocation
- lightweight hook behavior

## Runtime notes

Two things are easy to miss when you smoke-test this workspace in VS Code:

- custom agents appear in the **Agent** picker or `/agents`; they do not become
  magical always-on personas in plain Ask replies;
- handoff buttons only appear after a response from the selected custom agent;
- hooks are only meaningful during an actual agent session; `PostToolUse` needs
  a real tool invocation, not a text-only reply.

If instructions load but agents or hook logs do not show up, follow the
[proof checklist](./PROOF-CHECKLIST.md) before concluding the workspace is
broken.
