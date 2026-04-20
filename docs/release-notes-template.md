# Release Notes Template

Use this template when shipping a new `oh-my-copilot` version.

## Summary

- What changed for users?
- What changed for maintainers?
- Did root workspace behavior, plugin behavior, or example behavior change?

## User-facing changes

- install/bootstrap changes
- root prompt / root agent / root skill changes
- plugin route changes
- documentation or proof-path changes

## Verification evidence

- `bash scripts/validate-doc-links.sh`
- `bash scripts/validate-power-surfaces.sh`
- `bash scripts/validate-root-copilot-surfaces.sh`
- `./scripts/bootstrap-copilot-power.sh`
- `./scripts/smoke-copilot-cli.sh`

## Known limitations

- root-only limitations
- plugin-only limitations
- example-only limitations

## Versioning note

- Plugin version in `packages/copilot-cli-plugin/plugin.json`:
- Release tag:
