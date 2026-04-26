# Migration SOP

_Status: staging rehearsal required before production._

## Policy

No schema/data migration may be promoted to production unless it is rehearsed
against staging or an equivalent restore target and has a rollback/restore path.

## Pre-migration checklist

- [ ] Release candidate commit recorded.
- [ ] Working tree clean.
- [ ] Migration diff reviewed by engineering/data owner.
- [ ] Backup/snapshot captured.
- [ ] Rollback path identified.
- [ ] Smoke tests selected:
  - health/readiness,
  - strict auth,
  - capture,
  - feed,
  - Brain Item Detail/comments,
  - task/session,
  - two-user denial,
  - storage if enabled.

## Local rehearsal

1. `pnpm reset && pnpm seed`.
2. Run the migration or schema update.
3. Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, and relevant smoke commands.
4. Run `pnpm check:storage-smoke` if migration touches data/storage tables.

## Staging rehearsal

1. Confirm staging backup/snapshot exists.
2. Deploy migration to staging.
3. Run staging API smoke.
4. Run two-user isolation smoke.
5. Run web smoke.
6. Record migration duration, errors, and smoke evidence in the staging packet.

## Rollback/restore

If the migration is reversible, document the exact reverse command. If it is not
reversible, production approval requires a restore decision and accepted RPO/RTO
risk.

## Production no-go

Production migration remains blocked if staging migration evidence, backup
evidence, or post-migration smoke evidence is missing.
