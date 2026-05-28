# Security Policy

`oh-my-copilot` includes local hooks and an MCP server that can process rule
files, pending context, and token-like strings. Please report suspected security
issues privately instead of opening a public issue.

## Reporting a vulnerability

Email the maintainer listed on the GitHub repository profile or use GitHub's
private vulnerability reporting if it is enabled for this repository. Include:

- affected component and version/commit;
- reproduction steps or a minimal proof of concept;
- expected impact and any known mitigations;
- whether any secret or token value was exposed.

## Handling secrets in reports

Do not include live tokens. Replace examples with synthetic values such as
`github_pat_example...` or redact them before sharing logs.

## Supported versions

Security fixes target the current `main` branch and the latest published plugin
version when releases are available.
