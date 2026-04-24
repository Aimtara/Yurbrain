# Nhost Baseline Cutover Checklist

Use this checklist to move Yurbrain from repository-managed SQL migrations (`packages/db/migrations`) to Nhost/Hasura-managed migration + metadata deploy flow.

## Goal

After completion:

- `nhost/migrations/default` contains canonical schema migrations.
- `nhost/metadata` contains canonical Hasura metadata.
- `nhost up` and cloud deploy can apply schema + metadata from the standard Nhost layout.

## Preconditions

1. Confirm existing schema source: `packages/db/migrations`.
2. Confirm Nhost project config exists: `nhost/config.yaml`.
3. Ensure local Docker + Nhost CLI are available.

## One-time baseline process

1. **Freeze schema writes**
   - Pause feature work that changes DB schema until baseline is complete.

2. **Start local Nhost services**
   - `nhost up`

3. **Materialize current schema into the Nhost Postgres target**
   - Apply existing SQL migration chain (`packages/db/migrations/*.sql`) to the target Postgres used by Nhost.
   - Validate tables/indexes/constraints exist.

4. **Generate the first Nhost migration baseline**
   - Create a baseline migration under `nhost/migrations/default` that represents current schema state.
   - Name it with timestamp semantics to preserve ordering.

5. **Export and commit Hasura metadata**
   - Export metadata into `nhost/metadata`.
   - Include permissions/relationships/actions/functions configuration.

6. **Verify local replay from scratch**
   - Reset local Nhost Postgres.
   - Re-apply only Nhost migrations + metadata.
   - Confirm schema and app behavior match pre-cutover state.

7. **Flip source of truth**
   - Treat `nhost/migrations/default` + `nhost/metadata` as canonical for schema/metadata pushes.
   - Stop adding new migration SQL files under `packages/db/migrations` for Nhost-bound environments.

## Validation commands

From repo root:

```bash
nhost up
pnpm --filter api test
pnpm --filter web build
pnpm test:e2e
```

If these checks pass after replay, baseline cutover is considered complete.

## Rollback strategy

If replay fails, keep Nhost baseline branch unmerged and continue using existing `packages/db/migrations` flow while repairing migration/metadata parity.
