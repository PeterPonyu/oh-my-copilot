# V1 Repository Blueprint

This blueprint describes a docs-first public repository. It is intentionally not
a runtime implementation plan.

## Target layout

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

## Artifact roles

| Path | Role | V1 boundary |
| --- | --- | --- |
| `README.md` | Public orientation and reading path | Must state docs/research-first and CLI-only scope. |
| `docs/design-spec.md` | Canonical v1 spec | Must include non-goals and acceptance checklist. |
| `docs/comparison-matrix.md` | Lineage comparison | Must avoid parity claims. |
| `docs/copilot-native-mapping.md` | Concept translation | Must cite Copilot primitives and label inference. |
| `docs/references.md` | Citation registry | Must be updated when claims change. |
| `research/*.md` | Evidence base | Must separate source observations from design synthesis. |
| `examples/copilot-cli-layout/` | Illustrative layout | Not a supported runtime or template until verified. |
| `scripts/validate-doc-links.sh` | Documentation hygiene | Must not implement product orchestration. |
| `.github/workflows/docs-check.yml` | Optional CI for docs | Must only run docs checks. |

## Future extension gates

A future implementation can widen scope only with a new plan that answers:

1. Which Copilot CLI feature is missing from docs-only v1?
2. Why instructions/agents/skills/hooks/MCP/plugins are insufficient by
   themselves?
3. What runtime behavior will be tested in Copilot CLI?
4. How will the design avoid OMC/OMX parity drift?

Until that plan exists, keep this repository as a public research corpus with
illustrative examples.
