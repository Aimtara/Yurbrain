# Package Boundary Guidelines (P4)

_Last updated: 2026-04-20_

## Goal

Keep app code (`apps/*`) dependent on package entrypoints (`@yurbrain/*`) instead of internal filesystem paths like `packages/*/src`.

This preserves stable boundaries, reduces refactor breakage, and keeps deployment/compilation behavior predictable.

## Required import rules

1. In app code, import shared modules via workspace aliases:
   - `@yurbrain/contracts`
   - `@yurbrain/db`
   - `@yurbrain/ai`
   - `@yurbrain/client`
   - `@yurbrain/ui`
2. Do not import shared package internals from app code:
   - forbidden pattern: `../../../../packages/<pkg>/src/...`
3. Internal package code may still import within its own `src` tree.

## Guardrail

Use the boundary check script before merge:

- `pnpm check:boundaries`

The script fails if any app code contains relative imports into `packages/*/src`.

## Current deferred items

- `docs/*` and tooling references may still mention `packages/*/src` as documentation examples and are not runtime boundary violations.
- If we later split package public APIs further, update package `src/index.ts` exports first, then migrate app imports.

## Recommended review checklist

- Any new app import from shared code uses `@yurbrain/*`.
- No new e2e tests import `apps/api/src/*` directly; use `apps/api/testing` for test harness.
- If a package symbol is missing from entrypoint, add it to that package’s `src/index.ts` instead of bypassing with `packages/*/src`.
