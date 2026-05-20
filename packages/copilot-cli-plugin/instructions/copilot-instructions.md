# [OMCP] Copilot workspace instructions

This root is a first-class Copilot workspace registration target for
`oh-my-copilot`.

- Keep the project Copilot CLI-first and docs/research-first.
- Do not present this repository as a full OMC/OMX runtime, parity clone, or
  replacement for Copilot CLI.
- Treat `packages/copilot-cli-plugin/` as the canonical reusable plugin package
  and source for mirrored root agents, prompts, skills, and instructions.
- Use root `.github/` files as generated current-directory registration mirrors.
- Treat `examples/` as illustrative or smoke-test workspaces, not as hidden root
  discovery dependencies.
- Prefer existing validation scripts and explicit evidence before claiming a
  root surface works.
