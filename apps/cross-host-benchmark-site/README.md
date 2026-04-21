# cross-host-benchmark-site

Static-first Next.js App Router workspace for the cross-host benchmark presentation.

## Commands

- `pnpm dev`
- `pnpm build` — canonical static build command; emits `out/`
- `pnpm test` — baseline scaffold verification (`eslint` + `tsc --noEmit`)
- `pnpm lint`
- `pnpm typecheck`

## Notes

- `next.config.ts` sets `output: 'export'`.
- This workspace is intentionally self-contained with its own `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`.
- Generated snapshot inputs belong under `generated/` and are the only intended site-build data input surface in later implementation phases.
