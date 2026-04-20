# Testing This Repo in VS Code Copilot

_Current as of April 20, 2026._

## Short version

Yes, parts of this repo can be tested in **current VS Code Copilot**, and the
repo now has **two different VS Code testing levels**:

- a smaller **illustrative CLI-oriented layout**
- a stronger **VS Code power workspace**

The important boundary is:

- this repo is still **Copilot CLI-first** by design;
- the stronger VS Code test target is
  [`examples/vscode-copilot-layout/`](../examples/vscode-copilot-layout/);
- the older lightweight example is still
  [`examples/copilot-cli-layout/`](../examples/copilot-cli-layout/);
- the repo root is a research corpus, not a fully wired VS Code customization
  package.

## What VS Code Copilot officially supports today

According to current official VS Code and GitHub docs, VS Code Copilot supports:

- workspace custom instructions via `.github/copilot-instructions.md`
- path-specific instruction files via `.github/instructions/*.instructions.md`
- `AGENTS.md` in the workspace root when `chat.useAgentsMdFile` is enabled
- custom agents via `.github/agents/*.agent.md`
- agent skills via directories containing `SKILL.md`
- prompt files via `.github/prompts/*.prompt.md`

Official references:

- VS Code custom instructions:
  https://code.visualstudio.com/docs/copilot/customization/custom-instructions
- VS Code custom agents:
  https://code.visualstudio.com/docs/copilot/customization/custom-agents
- VS Code agent skills:
  https://code.visualstudio.com/docs/copilot/customization/agent-skills
- VS Code prompt files:
  https://code.visualstudio.com/docs/copilot/customization/prompt-files
- VS Code Copilot settings reference:
  https://code.visualstudio.com/docs/copilot/reference/copilot-settings
- GitHub custom-instruction support matrix:
  https://docs.github.com/en/copilot/reference/custom-instructions-support

## What to test in this repo right now

### Recommended target: the stronger VS Code workspace

Use:

- [`examples/vscode-copilot-layout/`](../examples/vscode-copilot-layout/)

It currently contains:

- workspace settings for Copilot customization discovery
- `AGENTS.md`
- `.github/copilot-instructions.md`
- path-specific instructions
- custom agents with handoffs:
  - planner -> implementer -> reviewer -> verifier
- prompt files
- skills backed by shell scripts
- bounded hooks
- sample `.ts` and `.tsx` files

### Secondary target: the smaller CLI-oriented example

Use:

- [`examples/copilot-cli-layout/`](../examples/copilot-cli-layout/)

This remains useful when you want the smallest workspace that still exercises
instructions, agents, skills, and hooks.

## Recommended next steps

1. Test the **VS Code power workspace** first.
2. Confirm which customizations VS Code loads automatically.
3. Exercise agent handoffs, prompt files, and skills with scripts.
4. Use the smaller CLI-oriented example only when you want a reduced baseline.

## How to test in VS Code

### 1. Open the example as the workspace root

Open this folder in VS Code, not the repo root:

```text
/home/zeyufu/Desktop/oh-my-copilot/examples/vscode-copilot-layout
```

Why: VS Code discovers `.github/copilot-instructions.md`, `.github/instructions`,
`.github/agents`, and `AGENTS.md` relative to the **workspace root**. In this
repo, those files live under the example folder, not at the top of the research repo.

### 2. Make sure Copilot Chat / agent features are enabled

Use a recent stable VS Code with GitHub Copilot enabled, then confirm these
settings are on:

- `github.copilot.chat.codeGeneration.useInstructionFilesAutomatically`
- `chat.includeApplyingInstructions`
- `chat.useAgentsMdFile`
- `chat.useAgentSkills`

If needed, also confirm:

- `.github/instructions` is allowed in `chat.instructionsFilesLocations`
- `.github/agents` is allowed in `chat.agentFilesLocations`

### 3. Open Copilot Chat or Agent mode

Then run a few smoke-test prompts.

Suggested prompts:

1. `What instructions are active in this workspace?`
2. `Using the planner agent, propose a bounded docs improvement for this workspace.`
3. `Using the reviewer agent, check whether this workspace implies parity with oh-my-codex.`
4. `Run /ship-docs for this workspace and explain what it would do.`
5. `Run /review-scope on the README and tell me whether it overclaims scope.`
5. Open a temporary `sample.ts` file and ask:
   `What TypeScript-specific instructions apply to this file?`

### 4. Verify expected behavior

You should expect these signals:

- The workspace-level `.github/copilot-instructions.md` is picked up.
- `AGENTS.md` affects chat behavior if `chat.useAgentsMdFile` is enabled.
- The `typescript.instructions.md` file applies when the active file matches
  `**/*.ts` or `**/*.tsx`.
- The custom agents appear in the agents UI.
- Handoff buttons appear after agent responses.
- The prompt files are runnable as slash commands.
- The skills are discoverable or usable in chat when relevant.

### 5. Use diagnostics when behavior is unclear

If VS Code does not appear to load the files you expect:

- open the Chat diagnostics view
- inspect the References section in chat responses
- check whether the correct workspace root is open
- confirm the relevant settings are enabled

## Important CLI hook caveat

When you test this workspace with **GitHub Copilot CLI** from inside the parent
`oh-my-copilot` repository, the CLI may treat the enclosing git repository as
the effective root. In practice, that means:

- instructions, prompts, skills, and agents in this example workspace may still
  be usable;
- but the workspace-local `.github/hooks/` behavior may not produce local
  `.copilot-hooks/*.log` evidence when run as a nested directory under the
  parent repo.

To prove the hook behavior with Copilot CLI, use the standalone-copy test:

```bash
cd /home/zeyufu/Desktop/oh-my-copilot
./scripts/prove-vscode-hook-standalone.sh
```

That script copies the workspace to a temporary standalone directory, runs a
minimal Copilot CLI session there, and checks that `.copilot-hooks/session.log`
is created.

## What not to expect yet

Do **not** treat this repo as already proving:

- a full VS Code-first `oh-my-copilot`
- runtime parity with `oh-my-claudecode` or `oh-my-codex`
- automatic tmux/team orchestration inside VS Code
- cloud-agent, IDE, and CLI unification in v1

This is still a **CLI-first research repo** with:

- a stronger VS Code power workspace; and
- a smaller illustrative CLI-oriented example layout.

## Best next repo improvement

If these tests go well, the next strongest follow-up is to add:

- a larger prompt library
- more skills with scripts/resources
- a more opinionated verifier/release flow
- optional plugin-backed reuse between the VS Code workspace and Copilot CLI
