# Package boundaries

Last updated: 2026-04-30

Yurbrain is a pnpm/Turborepo monorepo. Production-critical app code must depend on stable package-root APIs rather than package internals.

## Rule

Apps may import from package roots:

- `@yurbrain/contracts`
- `@yurbrain/db`
- `@yurbrain/ai`
- `@yurbrain/client`
- `@yurbrain/ui`
- `@yurbrain/nhost`

Apps must not import directly from:

- `packages/contracts/src`
- `packages/db/src`
- `packages/ai/src`
- relative paths that traverse into those package internals

This keeps API/web/mobile code from binding to private file layout and makes package exports the reviewable compatibility contract.

## Enforcement

Run:

```bash
pnpm check:package-boundaries
```

The script scans tracked app/package source files for app imports into protected package internals. It is included in `check:production-safety` and CI.

## Current exceptions

- Test fixtures may still use package-root imports to access types or helpers.
- Package code may import its own internal files.
- Documentation examples are not enforced by the script, but docs should still model package-root imports.

## Adding exports

When app code needs a package feature:

1. Add the export to the package root (`packages/<name>/src/index.ts`) if it is intended to be public.
2. Import from `@yurbrain/<name>`.
3. Add tests at the package or app boundary as appropriate.
4. Do not reach into `packages/<name>/src/*` from `apps/*`.
