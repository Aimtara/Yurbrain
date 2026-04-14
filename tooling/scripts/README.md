## Yurbrain tooling scripts

- `reset-dev-db.mjs`: resets the local PGlite runtime database path used by API dev runs.
- `seed-dev-db.mjs`: seeds usable test data into the same runtime database path.

Both scripts resolve defaults to:

- DB path: `<repo>/.yurbrain-data/runtime`
- Migrations path: `<repo>/packages/db/migrations`

Optional environment overrides:

- `YURBRAIN_DB_PATH`
- `YURBRAIN_MIGRATIONS_PATH`
- `YURBRAIN_WORKSPACE_ROOT`
