# Copilot workspace instructions

This root is a first-class Copilot workspace registration target for
`oh-my-copilot`.

- Keep the project Copilot CLI-first and docs/research-first.
- Do not present this repository as a full OMC/OMX runtime, parity clone, or
  replacement for Copilot CLI.
- Use root `.github/` files for current-directory agents, prompts, skills,
  instructions, and hooks.
- Treat `packages/copilot-cli-plugin/` as the canonical reusable plugin package
  for namespaced agents, reusable skills, hooks, and plugin metadata.
- Treat `examples/` as illustrative or smoke-test workspaces, not as hidden root
  discovery dependencies.
- Prefer existing validation scripts and explicit evidence before claiming a
  root surface works.
