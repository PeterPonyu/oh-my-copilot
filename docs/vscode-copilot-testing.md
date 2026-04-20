# Testing This Repo in VS Code Copilot

_Current as of April 20, 2026._

## Short version

Yes, parts of this repo can be tested in **current VS Code Copilot**, and the
repo now has **three different Copilot testing levels**:

- the **root workspace** for current-directory instructions, agents, prompts,
  skills, hooks, and docs validation;
- a stronger **VS Code power workspace** under `examples/`; and
- a smaller **CLI-oriented illustrative layout** under `examples/`.

The important boundary is:

- this repo is still **Copilot CLI-first** by design;
- the root workspace is the recommended current-directory target;
- [`packages/copilot-cli-plugin/`](../packages/copilot-cli-plugin/) remains the
  reusable plugin package;
- [`examples/vscode-copilot-layout/`](../examples/vscode-copilot-layout/) is a
  strong VS Code smoke-test workspace, not root proof; and
- nested example hooks should not be used as evidence that root hooks work.

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

### Recommended current-directory target: the root workspace

Use the repository root:

```text
/home/zeyufu/Desktop/oh-my-copilot
```

The root registration target is expected to host:

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- root-local custom agents such as `research`, `reviewer`, and `verifier`
- root prompt files such as `/ship-docs`, `/review-scope`, and
  `/root-registration-check`
- root-local skills such as `docs-ship` and `parity-guard`
- root hooks that write source-labelled evidence under `.copilot-hooks/`

Use the root when you want to prove current-directory behavior. Use the plugin
package only when you are testing reusable installed-plugin behavior, and use
examples only when you are testing an illustrative workspace in isolation.

### Secondary target: the stronger VS Code workspace

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

This remains useful for VS Code-specific smoke testing, but it is not the proof
path for root hook behavior when opened as a nested folder inside the parent git
repository.

### Smallest baseline: the CLI-oriented example

Use:

- [`examples/copilot-cli-layout/`](../examples/copilot-cli-layout/)

This remains useful when you want the smallest workspace that still illustrates
instructions, agents, skills, and hooks.

## Recommended next steps

1. Test the **root workspace** first when validating current-directory behavior.
2. Confirm root instructions, root-local agents, root prompts, root skills, and
   root hooks are discoverable.
3. Test the namespaced plugin route separately when validating reusable plugin
   behavior.
4. Test the **VS Code power workspace** when you want richer VS Code handoff and
   prompt-file behavior.
5. Use the smaller CLI-oriented example only when you want a reduced baseline.

## How to test the root workspace

### 1. Open the repository root

Open this folder in VS Code:

```text
/home/zeyufu/Desktop/oh-my-copilot
```

Why: the root registration surfaces are discovered relative to the workspace
root. Opening a nested example folder changes which `.github/` and `AGENTS.md`
files are active.

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

### 3. Run root smoke-test prompts

Suggested prompts from the repo root:

1. `What instructions are active in this repository?`
2. `Using the reviewer agent, check whether README.md overclaims OMC/OMX parity.`
3. `Using the verifier agent, list the validation evidence needed for root registration.`
4. `Run /review-scope README.md and summarize any scope risks.`
5. `Run /ship-docs docs/root-registration.md and tell me which checks it would run.`
6. `Run /root-registration-check and separate root, plugin, and example findings.`

Expected signals:

- root `.github/copilot-instructions.md` and `AGENTS.md` influence the answer;
- root-local agents appear by short name;
- root prompt files route to root agents; and
- root skills choose root-relative validation commands.

### 4. Test root-vs-plugin agent ambiguity

From the repository root, test both routes separately in Copilot CLI when the
plugin is installed:

```bash
copilot --agent reviewer -s -p "Reply with exactly: ROOT_AGENT_OK" --model auto --allow-all
copilot --agent 'oh-my-copilot-power-pack:reviewer' -s -p "Reply with exactly: PLUGIN_AGENT_OK" --model auto --allow-all
```

Pass criteria:

- both invocations succeed;
- the unnamespaced `reviewer` route is the root-local agent; and
- the namespaced route is the reusable plugin agent.

### 5. Verify root hooks with root evidence

Run a root Copilot session from:

```text
/home/zeyufu/Desktop/oh-my-copilot
```

Then inspect:

```bash
find .copilot-hooks -maxdepth 1 -type f -print
```

Pass criteria:

- `.copilot-hooks/session.log` receives a fresh `source=root-workspace` entry;
- `.copilot-hooks/tools.log` receives a fresh `source=root-workspace` entry
  after tool use; and
- plugin hook entries, if present, are distinguishable from root hook entries.

## How to test the VS Code power workspace

### 1. Open the example as the workspace root

Open this folder in VS Code, not the repo root:

```text
/home/zeyufu/Desktop/oh-my-copilot/examples/vscode-copilot-layout
```

Why: VS Code discovers `.github/copilot-instructions.md`, `.github/instructions`,
`.github/agents`, and `AGENTS.md` relative to the **workspace root**. Opening the
example itself proves the example workspace; opening the repo root proves the
root workspace.

### 2. Confirm settings and run smoke prompts

Use the same Copilot settings listed above, then try:

1. `What instructions are active in this workspace?`
2. `Using the planner agent, propose a bounded docs improvement for this workspace.`
3. `Using the reviewer agent, check whether this workspace implies parity with oh-my-codex.`
4. `Run /ship-docs for this workspace and explain what it would do.`
5. `Run /review-scope on the README and tell me whether it overclaims scope.`
6. Open a temporary `sample.ts` file and ask:
   `What TypeScript-specific instructions apply to this file?`

### 3. Verify expected example behavior

You should expect these signals:

- the example workspace-level `.github/copilot-instructions.md` is picked up;
- `AGENTS.md` affects chat behavior if `chat.useAgentsMdFile` is enabled;
- the `typescript.instructions.md` file applies when the active file matches
  `**/*.ts` or `**/*.tsx`;
- the custom agents appear in the agents UI;
- handoff buttons appear after agent responses;
- the prompt files are runnable as slash commands; and
- the skills are discoverable or usable in chat when relevant.

## Diagnostics when behavior is unclear

If VS Code does not appear to load the files you expect:

- open the Chat diagnostics view;
- inspect the References section in chat responses;
- check whether the correct workspace root is open;
- confirm the relevant settings are enabled; and
- verify whether you are testing root behavior, plugin behavior, or example
  behavior.

## Important CLI hook caveat

When you test the example workspace with **GitHub Copilot CLI** from inside the
parent `oh-my-copilot` repository, the CLI may treat the enclosing git repository
as the effective root. In practice, that means:

- instructions, prompts, skills, and agents in this example workspace may still
  be usable;
- but the workspace-local `.github/hooks/` behavior may not produce local
  `.copilot-hooks/*.log` evidence when run as a nested directory under the
  parent repo; and
- only root-session hook logs count as proof of root hook registration.

To prove the example hook behavior with Copilot CLI, use the standalone-copy
test:

```bash
cd /home/zeyufu/Desktop/oh-my-copilot
./scripts/prove-vscode-hook-standalone.sh
```

That script copies the workspace to a temporary standalone directory, runs a
minimal Copilot CLI session there, and checks that `.copilot-hooks/session.log`
is created. Treat that as example proof, not root proof.

The workspace hook scripts use the same policy as the root workspace:

- create `.copilot-hooks/config.json` only if it is missing
- append structured events to `.copilot-hooks/events.jsonl`
- keep human-readable summaries in `.copilot-hooks/session.log` and
  `.copilot-hooks/tools.log`

## What not to expect yet

Do **not** treat this repo as already proving:

- a full VS Code-first `oh-my-copilot`;
- runtime parity with `oh-my-claudecode` or `oh-my-codex`;
- automatic tmux/team orchestration inside VS Code; or
- cloud-agent, IDE, and CLI unification in v1.

This is still a **CLI-first research repo** with:

- a root workspace registration target;
- an experimental reusable Copilot CLI plugin package;
- a stronger VS Code power workspace; and
- a smaller illustrative CLI-oriented example layout.

## Best next repo improvement

If these tests go well, the next strongest follow-up is to keep root, plugin,
and example surfaces synchronized with validation that catches:

- prompts referencing missing agents;
- agent handoffs referencing missing agents;
- root skills calling missing or non-executable scripts;
- hook policies that do not parse; and
- docs that blur root, plugin, and example boundaries.
