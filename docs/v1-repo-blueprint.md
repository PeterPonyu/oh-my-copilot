# v1 Repository Blueprint

`oh-my-copilot` v1 is a public research and design repository for a GitHub Copilot CLI-first adaptation of ideas from `oh-my-claudecode` and `oh-my-codex`. This blueprint describes the intended repository shape and the role of each artifact. It is not a runtime implementation plan and does not claim feature parity with either source project.

## Scope Boundary

### In scope for v1

- Publish a readable design corpus for a Copilot CLI-first project.
- Explain how Copilot-native primitives can carry comparable intent to selected OMC/OMX concepts without forcing identical names or behavior.
- Provide illustrative repository files that show where Copilot CLI instructions, agents, skills, and hooks could live.
- Keep executable content limited to documentation hygiene, such as link validation.

### Out of scope for v1

- Runtime orchestration machinery.
- Cloud-agent, IDE, SDK, or multi-surface product implementation.
- Claims that Copilot CLI fully reimplements OMC/OMX workflows.
- Published plugins, MCP servers, or hook policies that have not been exercised in a real Copilot CLI session.

## Proposed Repository Layout

```text
oh-my-copilot/
├── README.md
├── LICENSE
├── docs/
│   ├── design-spec.md
│   ├── comparison-matrix.md
│   ├── v1-repo-blueprint.md
│   ├── copilot-native-mapping.md
│   └── references.md
├── research/
│   ├── omc-analysis.md
│   ├── omx-analysis.md
│   └── copilot-cli-capabilities.md
├── examples/
│   └── copilot-cli-layout/
│       ├── AGENTS.md
│       └── .github/
│           ├── copilot-instructions.md
│           ├── instructions/
│           │   └── typescript.instructions.md
│           ├── agents/
│           │   ├── research.agent.md
│           │   └── reviewer.agent.md
│           ├── skills/
│           │   ├── ecosystem-compare/
│           │   │   └── SKILL.md
│           │   └── blueprint-check/
│           │       └── SKILL.md
│           └── hooks/
│               └── policy.json
├── scripts/
│   └── validate-doc-links.sh
└── .github/
    └── workflows/
        └── docs-check.yml
```

## Artifact Roles

| Path | Role | v1 boundary |
| --- | --- | --- |
| `README.md` | Public entry point, scope statement, reading path, and project status. | Must say v1 is research-first and Copilot CLI-only. |
| `LICENSE` | Open-source license for the research corpus and examples. | Should be chosen explicitly by the project owner. |
| `docs/design-spec.md` | Canonical product/design spec for v1. | Should describe desired behavior and non-goals, not runtime internals. |
| `docs/comparison-matrix.md` | Side-by-side comparison of OMC, OMX, and `oh-my-copilot` v1. | Must separate reference lineage from implementation contract. |
| `docs/copilot-native-mapping.md` | Mapping from source-system concepts to Copilot CLI primitives. | Should prefer native Copilot mechanisms over 1:1 parity. |
| `docs/references.md` | Citation index for GitHub Docs, GitHub changelog, and local source analyses. | Every public Copilot capability claim should be traceable here. |
| `research/omc-analysis.md` | Evidence and synthesis from `oh-my-claudecode`. | Should distinguish source facts from interpretation. |
| `research/omx-analysis.md` | Evidence and synthesis from `oh-my-codex`. | Should distinguish source facts from interpretation. |
| `research/copilot-cli-capabilities.md` | Current Copilot CLI capability inventory. | Should cite GitHub sources and include access dates. |
| `examples/copilot-cli-layout/` | Copyable-but-illustrative layout for a downstream Copilot CLI-aware repository. | Must remain labeled as illustrative until validated in Copilot CLI. |
| `scripts/validate-doc-links.sh` | Lightweight documentation link checker. | Documentation hygiene only; no product runtime behavior. |
| `.github/workflows/docs-check.yml` | Optional CI wrapper for documentation hygiene. | Runs docs checks only. |

## Example Layout Rationale

The example layout uses Copilot-native locations that are documented by GitHub as of April 20, 2026:

- Repository-wide instructions can live in `.github/copilot-instructions.md`.
- Path-specific instructions can live below `.github/instructions/` and use `applyTo` frontmatter.
- `AGENTS.md` can provide agent instructions in a repository or working directory.
- Repository-level custom agents can live under `.github/agents/` as Markdown agent profiles, with `.agent.md` recommended for CLI custom agents.
- Project skills can live under `.github/skills/` with a `SKILL.md` file.
- Hook configuration can live under `.github/hooks/` and declare event handlers in JSON.

These examples are intentionally conservative. They show placement, naming, and scope language; they do not claim that `oh-my-copilot` has shipped a plugin, MCP server, or orchestration runtime.

## Build Order for Future Contributors

1. Create source-grounding research files first, including citation paths.
2. Draft public docs from the research, keeping v1 scope repeated in direct-entry pages.
3. Add or update the illustrative example layout only after the mapped Copilot primitive is documented.
4. Run documentation hygiene checks and scope-language review.
5. Record any unverified examples as follow-ups instead of promoting them to supported features.

## Verification Checklist

Use this checklist when reviewing a v1 draft:

- [ ] `README.md` and `docs/design-spec.md` explicitly say v1 is Copilot CLI-first.
- [ ] Multi-surface expansion is framed only as future work or a non-goal.
- [ ] `docs/copilot-native-mapping.md` recommends Copilot-native adaptation instead of forced parity.
- [ ] `docs/comparison-matrix.md` includes OMC, OMX, and `oh-my-copilot` v1.
- [ ] Every Copilot capability claim has a citation in `docs/references.md` or local research.
- [ ] Example files are labeled illustrative and bounded.
- [ ] `scripts/validate-doc-links.sh` passes, or failures are documented as known follow-ups.
- [ ] No runtime implementation files were introduced outside docs, research, examples, scripts, and docs-only workflow hygiene.

## Source Pointers

- GitHub Docs: [Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- GitHub Docs: [Using GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-agents/overview)
- GitHub Docs: [Adding agent skills for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills)
- GitHub Docs: [Creating and using custom agents for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli)
- GitHub Docs: [Using hooks with GitHub Copilot agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-hooks)
- GitHub Docs: [Comparing GitHub Copilot CLI customization features](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/comparing-cli-features)
