# Backup and Restore Drill

_Status: required before production; not yet exercised for staging/production._

## Goal

Prove Yurbrain can recover user memory, continuity context, tasks/sessions, preferences, and attachment metadata after data loss or a failed migration.

## RTO/RPO targets for trusted alpha

| Target | Alpha objective | Status |
| --- | --- | --- |
| RTO | Restore service within 4 hours | Not measured |
| RPO | Lose no more than 24 hours of accepted data | Not measured |

Targets must be revisited before broader alpha.

## Drill scope

Minimum data to verify after restore:

- profiles,
- brain items,
- item artifacts,
- item threads,
- thread messages,
- feed cards,
- tasks,
- sessions,
- user preferences,
- events,
- attachment metadata,
- storage objects if attachments are production-supported.

## Local drill procedure

1. Start from a clean database: `pnpm reset && pnpm seed`.
2. Run a core-loop smoke that creates one new capture, comment, task, and session.
3. Snapshot the PGlite data directory or export data using the selected environment-specific backup mechanism.
4. Simulate loss by moving/removing the runtime DB directory.
5. Restore from the snapshot/export.
6. Start API and verify:
   - `/auth/me` works with strict bearer identity,
   - the seeded and newly created BrainItems are present,
   - feed cards are present,
   - comments/messages are present,
   - tasks/sessions are present,
   - preferences are present.
7. Record elapsed restore time and any data loss.

## Executable local metadata drill

The repository now includes a local PGlite backup/restore metadata drill:

```bash
pnpm check:backup-restore-smoke
```

This test creates a representative user, BrainItem, feed card, thread/message,
task, session, preference, event, and attachment metadata row; copies the PGlite
data directory as a backup snapshot; removes the original DB directory; restores
from the snapshot; and verifies all representative rows remain readable.

Scope limitations:

- This is local PGlite proof only, not staging/production infrastructure proof.
- It verifies attachment metadata, not object-storage file bytes.
- Staging must still exercise the environment-specific backup mechanism and
  measure RTO/RPO before production.

## Staging/production requirements

- Backups must be created before every production migration.
- Restore must be rehearsed in staging before production launch.
- Storage object restore must be included if attachments are production-supported.
- Any restore involving user content must preserve privacy and access controls.

## Evidence log

| Date | Environment | Backup source | RTO observed | RPO observed | Result | Link/notes |
| --- | --- | --- | --- | --- | --- | --- |
| Pending | Pending | Pending | Pending | Pending | Pending | Drill required |

