## Yurbrain tooling scripts

- `reset-dev-db.mjs`: resets the local PGlite runtime database path used by API dev runs.
- `seed-dev-db.mjs`: seeds usable test data into the same runtime database path.
- `nhost-production-safety-check.mjs`: validates Nhost production safety guardrails (no client admin-secret env usage, env-ignore hygiene, required `.env.example` presence).
- `secret-leak-check.mjs`: scans tracked text files for high-risk secret patterns.
- `package-boundary-check.mjs`: fails if app or package source files import package internals such as `packages/db/src`, `packages/ai/src`, or `packages/contracts/src`; apps must use package-root imports (`@yurbrain/db`, `@yurbrain/ai`, `@yurbrain/contracts`).

Both scripts resolve defaults to:

- DB path: `<repo>/.yurbrain-data/runtime`
- Migrations path: `<repo>/packages/db/migrations`

Optional environment overrides:

- `YURBRAIN_DB_PATH`
- `YURBRAIN_MIGRATIONS_PATH`
- `YURBRAIN_WORKSPACE_ROOT`

## Safety script prerequisites

- `secret-leak-check.mjs` and `nhost-production-safety-check.mjs` must run from a real git checkout.
- If `.git` is missing, both scripts now fail with a clear prerequisite error instead of a raw `git ls-files` stack trace.
