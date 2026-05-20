# [OMCP] Copilot surface audit and display prefix spec

## Goal

Audit the root and reusable plugin Copilot CLI surfaces against current GitHub
Copilot CLI documentation, then add a visible `[OMCP]` prefix to local
oh-my-copilot assets so they are easier to distinguish from unrelated agents,
skills, prompts, hooks, and plugins.

## Constraints

- Scope is root workspace surfaces and `packages/copilot-cli-plugin/` only.
- Do not update `examples/` in this pass.
- Preserve machine-readable IDs that Copilot CLI expects to be lowercase,
  hyphenated, or route-stable, including skill `name` fields, prompt `name`
  fields, agent file names, and plugin `name`.
- Prefer visible labels and descriptions for `[OMCP]` prefixing instead of
  changing invocation IDs.
- Keep the repository CLI-first, docs/research-first, and avoid OMC/OMX parity
  claims.

## Official documentation evidence

- Custom instructions: GitHub documents root `.github/copilot-instructions.md`,
  `.github/instructions/*.instructions.md`, and root `AGENTS.md` for Copilot CLI
  custom instructions.
- Skills: GitHub documents project skills at `.github/skills/<name>/SKILL.md`
  with required YAML `name` and `description`, and notes that skill subdirectory
  names should be lowercase and hyphenated.
- Custom agents: GitHub documents `.agent.md` custom agent profiles, with CLI
  project agents under `.github/agents/` and names that are easiest to use when
  lowercase and hyphenated.
- Hooks: GitHub documents repository hooks as JSON files under
  `.github/hooks/*.json` with `version: 1` and hook arrays.
- Plugins: GitHub documents plugin manifests as `plugin.json` with a required
  kebab-case `name`, optional `description`, and component paths for agents,
  skills, and hooks.

## Current repo facts

- Root custom instructions exist at `.github/copilot-instructions.md` and
  `AGENTS.md`.
- Path-specific instructions exist under `.github/instructions/`.
- Root agents exist under `.github/agents/*.agent.md`.
- Root prompts exist under `.github/prompts/*.prompt.md`; official support
  should be framed as host-dependent, not Copilot CLI proof.
- Root skills exist under `.github/skills/<name>/SKILL.md`.
- Root hooks exist under `.github/hooks/hooks.json`.
- The reusable plugin exists at `packages/copilot-cli-plugin/plugin.json`, with
  agents in `agents/`, skills in `skills/`, and hooks in `hooks.json`.

## Non-goals

- Do not rename files, skill directories, prompt command IDs, custom agent IDs,
  or the plugin package name.
- Do not add dependencies.
- Do not claim complete host-product parity or runtime-framework behavior.
- Do not make example workspaces authoritative for root behavior.

## Acceptance criteria

- Root and plugin CLI-supported surfaces continue to match the documented
  Copilot CLI layout, with prompt files explicitly treated as host-dependent
  repository templates.
- Root and plugin visible labels/descriptions/headings for local assets use a
  `[OMCP]` prefix where doing so does not break documented ID conventions.
- Documentation artifacts explain the official-docs comparison and the ID
  preservation decision.
- Existing validation scripts for docs and Copilot surfaces pass.

## Final clarity table

| Dimension | Score | Weighted contribution | Gap |
| --- | ---: | ---: | ---: |
| Goal clarity | 0.95 | 0.3325 | 0.05 |
| Constraint clarity | 0.95 | 0.2375 | 0.05 |
| Success criteria | 0.90 | 0.2250 | 0.10 |
| Context clarity | 0.95 | 0.1425 | 0.05 |

Final ambiguity: 0.0625.
