# Contributing

Thanks for helping improve `oh-my-copilot`. This repo is a Copilot CLI-first
research and registration workspace; keep changes scoped to repository-owned
behavior and avoid implying unsupported Copilot host behavior.

## Source-of-truth workflow

- Read [`AGENTS.md`](./AGENTS.md) before editing. It defines the canonical
  source map and verification expectations for this repository.
- Edit canonical plugin sources under `packages/copilot-cli-plugin/` first when
  changing mirrored Copilot agents, skills, prompts, or instructions.
- After canonical surface edits, run:

```bash
./scripts/regenerate-github-mirror.sh
./scripts/check-mirror-drift.sh
```

## Local validation

Run the checks that match your change. A broad pre-PR pass is:

```bash
node scripts/validate-plugin-orchestration.mjs
./scripts/validate-doc-links.sh
./scripts/validate-power-surfaces.sh
./scripts/validate-root-copilot-surfaces.sh
./scripts/validate-release-readiness.sh
```

For MCP server changes, also run:

```bash
cd packages/copilot-cli-plugin/mcp-server
npm install
npm test
npm run build:bundle
```

For benchmark logic changes, run:

```bash
python3 -m unittest discover -s benchmark -p 'test*.py'
```

## Pull requests

Open focused PRs with the problem, evidence, validation output, and any known
remaining gaps. Do not publish packages, create releases, or tag versions from a
contributor PR unless maintainers explicitly request it.
