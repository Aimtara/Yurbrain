# Vendor Inventory

Status: alpha governance baseline, not a legal/compliance certification.

| Vendor / component | Purpose | Data exposure | Current status | Production requirement |
| --- | --- | --- | --- | --- |
| Nhost | Auth, Postgres/Hasura, storage, serverless functions when deployed | user identity, app data, storage objects if enabled | Migration scaffolding and docs exist; staging proof pending | Environment audit, JWT/JWKS validation, bucket checks, backup/restore proof |
| PGlite | Local/dev/test embedded database | local development data | Active local runtime/test store | Not a managed production HA database by itself |
| GitHub Actions | CI verification | source code, logs, test output | Production safety workflow exists | No secrets in logs; retained immutable CI evidence |
| AI provider (future OpenAI-compatible path) | Optional bounded synthesis | selected source-grounded prompts if enabled | Real provider path is deferred/flagged; deterministic fallback is current core loop | AI disclosure, timeout/fallback, data minimization, observability |
| Expo / React Native ecosystem | Mobile preview/development | mobile app code/build metadata | Mobile preview only | Production smoke and release process before mobile launch |
| Vercel/hosting provider (if selected) | Web hosting | web app runtime logs and env vars | Not finalized in repo | Public-safe env vars only; rollback and observability proof |

## Rules

- Do not claim SOC 2, HIPAA, GDPR, or enterprise compliance based only on this inventory.
- Do not send raw user memory to AI providers unless a product flag, disclosure path, grounding, and fallback policy are complete.
- Do not expose admin secrets to web/mobile bundles.
