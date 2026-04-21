# V1 Repository Blueprint

This blueprint describes a docs-first public repository that can also be opened
as a first-class Copilot workspace. It is intentionally not a runtime
implementation plan.

For the source-of-truth matrix behind the root registration work, see
[root registration](./root-registration.md).

In this document, "v1" refers to the public repository blueprint. The root
workspace, reusable plugin package, and example workspaces are architectural
layers with different ownership and proof rules, not version stages.

## Target layout

```text
oh-my-copilot/
├── AGENTS.md
├── README.md
├── LICENSE
├── .github/
│   ├── copilot-instructions.md
│   ├── instructions/
│   │   ├── docs.instructions.md
│   │   ├── copilot-surfaces.instructions.md
│   │   └── scripts.instructions.md
│   ├── agents/
│   │   ├── research.agent.md
│   │   ├── reviewer.agent.md
│   │   └── verifier.agent.md
│   ├── prompts/
│   │   ├── ship-docs.prompt.md
│   │   ├── review-scope.prompt.md
│   │   └── root-registration-check.prompt.md
│   ├── skills/
│   │   ├── docs-ship/
│   │   │   └── SKILL.md
│   │   └── parity-guard/
│   │       └── SKILL.md
│   ├── hooks/
│   │   └── hooks.json
│   └── workflows/
│       └── docs-check.yml
├── .copilot-hooks/
│   ├── session-start.sh
│   └── post-tool-audit.sh
├── docs/
│   ├── design-spec.md
│   ├── comparison-matrix.md
│   ├── v1-repo-blueprint.md
│   ├── copilot-native-mapping.md
│   ├── root-registration.md
│   ├── vscode-copilot-testing.md
│   └── references.md
├── research/
│   ├── omc-analysis.md
│   ├── omx-analysis.md
│   └── copilot-cli-capabilities.md
├── examples/
│   ├── copilot-cli-layout/
│   │   ├── AGENTS.md
│   │   └── .github/
│   │       ├── copilot-instructions.md
│   │       ├── instructions/
│   │       │   └── typescript.instructions.md
│   │       ├── agents/
│   │       │   ├── research.agent.md
│   │       │   └── reviewer.agent.md
│   │       ├── skills/
│   │       │   ├── ecosystem-compare/
│   │       │   │   └── SKILL.md
│   │       │   └── blueprint-check/
│   │       │       └── SKILL.md
│   │       └── hooks/
│   │           └── policy.json
│   └── vscode-copilot-layout/
├── packages/
│   └── copilot-cli-plugin/
└── scripts/
    ├── validate-doc-links.sh
    ├── validate-power-surfaces.sh
    └── validate-root-copilot-surfaces.sh
```

## Artifact roles

| Path | Role | V1 boundary |
| --- | --- | --- |
| `README.md` | Public orientation and reading path | Must state docs/research-first, CLI-first scope, the root/plugin/example split, and the repo-vs-host claim/proof rule. |
| `AGENTS.md` | Root agent guidance | Governs the current repository root, not nested examples or installed plugins. |
| `.github/copilot-instructions.md` | Root Copilot workspace instructions | Must preserve CLI-first and non-parity boundaries. |
| `.github/instructions/*.instructions.md` | Path-specific root instructions | Must scope docs, scripts, and Copilot surface files explicitly. |
| `.github/agents/*.agent.md` | Root-local current-directory agents | Must use short names only for root work and keep plugin-equivalent namespaced routes distinct. |
| `.github/prompts/*.prompt.md` | Root prompt routing | Must reference root agents that exist and avoid example-only routes. |
| `.github/skills/*/SKILL.md` | Root skills | Must call root-relative scripts and not require changing into the plugin package. |
| `.github/hooks/hooks.json` | Root hook policy | Must be root proof, not nested example proof. |
| `.copilot-hooks/*.sh` | Root hook helpers | Must write source-labelled root-workspace evidence and keep logs out of source control. |
| `docs/design-spec.md` | Canonical v1 spec | Must include non-goals and acceptance checklist. |
| `docs/comparison-matrix.md` | Lineage comparison | Must avoid parity claims. |
| `docs/copilot-native-mapping.md` | Concept translation | Must cite Copilot primitives and label inference. |
| `docs/root-registration.md` | Root/plugin/example source-of-truth matrix | Must identify root as the current-directory target, plugin as reusable canonical package, and examples as illustrative-only proof boundaries. |
| `docs/vscode-copilot-testing.md` | Manual smoke-test guide | Must separate root proof from example workspace smoke tests. |
| `docs/references.md` | Citation registry | Must be updated when claims change. |
| `research/*.md` | Evidence base | Must separate source observations from design synthesis. |
| `examples/copilot-cli-layout/` | Illustrative CLI-oriented layout | Not a supported runtime or root proof. |
| `examples/vscode-copilot-layout/` | Illustrative VS Code power workspace | Useful for smoke tests; nested hook behavior is not root proof. |
| `packages/copilot-cli-plugin/` | Reusable Copilot CLI plugin package | Canonical for reusable plugin agents, skills, hooks, and plugin metadata. |
| `scripts/validate-doc-links.sh` | Documentation hygiene | Must not implement product orchestration. |
| `scripts/validate-power-surfaces.sh` | Power-surface validation | Checks examples, plugin package, and root docs mentions. |
| `scripts/validate-root-copilot-surfaces.sh` | Root surface validation | Checks root instructions, agents, prompts, skills, hooks, and routing references when present. |
| `.github/workflows/docs-check.yml` | Optional CI for docs and surfaces | Must run validation only, not product runtime behavior. |

## Root/plugin/example ownership

| Capability | Root owner | Plugin owner | Example role |
| --- | --- | --- | --- |
| Instructions | Root `AGENTS.md` and `.github/instructions/` | Plugin skill/agent docs only | Demonstrate workspace-specific instructions. |
| Agents | Root `.github/agents/` aliases | `packages/copilot-cli-plugin/agents/` | Demonstrate richer handoff layouts. |
| Prompts | Root `.github/prompts/` | No plugin prompt source today | Seed ideas only. |
| Skills | Root `.github/skills/` wrappers | `packages/copilot-cli-plugin/skills/` | Demonstrate skill shape and scripts. |
| Hooks | Root `.github/hooks/hooks.json` and `.copilot-hooks/` helpers | `packages/copilot-cli-plugin/hooks.json` and scripts | Standalone proof only, not root proof. |

The ownership split also controls proof language:

- root claims should be backed by root files, root validators, and root smoke
  evidence;
- plugin claims should be backed by plugin metadata, plugin validators, and
  plugin install/smoke evidence;
- example claims should stay illustrative unless explicitly promoted by a new
  plan and fresh proof; and
- Copilot host-product features such as plan/autopilot/delegation should be
  cited as upstream CLI capabilities, not implied as repo-owned implementation.

## Future extension gates

A future implementation can widen scope only with a new plan that answers:

1. Which Copilot CLI feature is missing from docs-first v1?
2. Why instructions/agents/skills/hooks/MCP/plugins are insufficient by
   themselves?
3. What runtime behavior will be tested in Copilot CLI?
4. How will the design avoid OMC/OMX parity drift?
5. Which surface owns the change: root workspace, reusable plugin, or example?
6. Which claims need repository proof versus host-product citations?

Until that plan exists, keep this repository as a public research corpus with a
root Copilot workspace registration surface, reusable plugin assets, and
illustrative examples.
