# Usage

Use `oh-my-copilot` from the repository root when you want Copilot CLI to see
root instructions, root agents, root prompts, root skills, and root validation
scripts together.

## Root workspace routes

The root workspace is the default current-directory product surface.

| Route | Kind | Use for |
| --- | --- | --- |
| `reviewer` | root agent | Reviewing docs, registration, routing, and parity-risk changes. |
| `verifier` | root agent | Checking validation evidence and remaining manual smoke-test gaps. |
| `research` | root agent | Grounding Copilot capability claims in repository files or official sources. |
| `/review-scope` | root prompt | Sending a target file or change to the root reviewer. |
| `/review` | root prompt | Short review alias for root-local review work. |
| `/ship-docs` | root prompt | Reviewing docs or registration changes before shipping. |
| `/install-check` | root prompt | Checking install/bootstrap proof from the root workspace. |
| `/plugin-review` | root prompt | Reviewing the reusable plugin package without confusing it with root-local aliases. |
| `/root-registration-check` | root prompt | Auditing root instructions, agents, prompts, skills, and hooks. |
| `docs-ship` | root skill | Running docs and surface checks before completion. |
| `parity-guard` | root skill | Scanning for overclaiming or forced-parity wording. |
| `root-surface-audit` | root skill | Auditing root Copilot registration files and routing. |

Root routes are intentionally short because they are scoped to this checkout.
They should not be treated as globally installed plugin names.

## Reusable plugin routes

The reusable plugin package lives in `packages/copilot-cli-plugin/`. After
bootstrap installation, use namespaced routes when you explicitly want the
installed plugin surface:

| Plugin route | Root-local counterpart |
| --- | --- |
| `oh-my-copilot-power-pack:reviewer` | `reviewer` |
| `oh-my-copilot-power-pack:verifier` | `verifier` |
| `oh-my-copilot-power-pack:research` | `research` |

The root route and plugin route may share intent, but they are different proof
surfaces. Root routes prove current-directory registration; namespaced routes
prove reusable plugin installation.

## Suggested day-one usage path

If you want the least confusing path, do this in order:

1. `./scripts/bootstrap-copilot-power.sh`
2. `./scripts/check-install-state.sh`
3. ask Copilot: `What instructions are active in this repository?`
4. use `/review-scope README.md`
5. use `/install-check`
6. use `/verify README.md` or the `verifier` agent for evidence

## Validation commands

Run these from the repository root:

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
```

Use bootstrap when `copilot` and `gh` are available:

```bash
./scripts/bootstrap-copilot-power.sh
```

If your checkout includes the dedicated install-state checker, run it after
bootstrap:

```bash
./scripts/check-install-state.sh
```

For benchmark-style local proof:

```bash
./benchmark/quick_test.sh
./benchmark/run_full_comparison.sh
```

## Hooks and evidence

Root hooks write local evidence under `.copilot-hooks/`:

- `.copilot-hooks/config.json` is created only when missing;
- `.copilot-hooks/events.jsonl` receives structured events;
- `.copilot-hooks/session.log` receives human-readable session summaries; and
- `.copilot-hooks/tools.log` receives human-readable tool-use summaries.

Hook evidence is project-local. Do not use nested example logs as proof of root
workspace hook registration.

## Recommended review loop

1. Make a small change.
2. Run the validation command that covers the changed area.
3. Ask `reviewer` or `/review-scope` to check scope, routing, and overclaims.
4. Ask `verifier` or `/root-registration-check` to summarize evidence and manual
   smoke-test gaps.
5. Record any remaining gaps in the final report or release notes.

## Advanced reading

- [Root registration](./root-registration.md) records the source-of-truth matrix
  for root, plugin, and example surfaces.
- [Copilot-native mapping](./copilot-native-mapping.md) explains why this repo
  adapts Copilot CLI primitives rather than cloning OMC/OMX runtime behavior.
- [VS Code and root testing](./vscode-copilot-testing.md) lists manual smoke
  tests and hook-evidence caveats.
