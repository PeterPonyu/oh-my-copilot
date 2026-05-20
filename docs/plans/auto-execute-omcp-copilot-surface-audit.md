# [OMCP] Copilot surface audit and display prefix plan

## Goal

Bring the local root and reusable plugin Copilot CLI surfaces in line with
current GitHub Copilot CLI documentation and make local oh-my-copilot assets
visibly distinguishable with a `[OMCP]` prefix.

## Non-goals

- Do not change example workspace surfaces.
- Do not rename invocation IDs, skill directories, prompt IDs, agent files, or
  plugin `name` values.
- Do not add runtime dependencies or new validation tooling.
- Do not claim this repository is a Copilot CLI replacement or OMC/OMX parity
  runtime.

## Acceptance criteria

- `AGENTS.md`, `.github/copilot-instructions.md`,
  `.github/instructions/*.instructions.md`, `.github/agents/*.agent.md`,
  `.github/prompts/*.prompt.md`, `.github/skills/*/SKILL.md`,
  `.github/hooks/hooks.json`, and `packages/copilot-cli-plugin/plugin.json`
  remain compatible with documented Copilot customization locations and required
  fields, with prompt files treated as host-dependent rather than Copilot CLI
  prompt-file proof.
- Visible local root and plugin asset labels use `[OMCP]` in headings and/or
  descriptions while stable IDs remain valid for CLI routing.
- A documentation artifact records the official documentation comparison and the
  decision not to prefix machine-readable IDs.
- Repository validation commands pass after edits.

## Implementation steps

1. Audit root and plugin surfaces against GitHub documentation for custom
   instructions, agents, prompts, skills, hooks, and plugins.
2. Prefix user-visible labels in root `AGENTS.md`, root Copilot instructions,
   `.github/agents`, `.github/prompts`, `.github/skills`, and reusable plugin
   `agents`, `skills`, README, and `plugin.json` descriptions.
3. Add a concise docs note under `docs/` with official-docs evidence, local
   surface mapping, and prefixing rationale.
4. Run existing validation scripts and fix any issues.
5. Run a separate review pass before declaring completion.

## Risks and mitigations

- Prefixing YAML `name` fields could break skill, prompt, agent, and plugin
  routing. Mitigation: prefix only descriptions/headings and keep IDs stable.
- Plugin-installed agents and root-local agents share short IDs. Mitigation:
  preserve documented namespacing guidance and use visible `[OMCP]` descriptions
  rather than renaming routes.
- Official docs evolve. Mitigation: cite the GitHub docs URLs consulted in the
  docs note and keep claims bounded to the checked surfaces.

## Verification commands

```bash
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
```
