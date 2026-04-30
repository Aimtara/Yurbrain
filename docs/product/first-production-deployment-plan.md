# First Production Deployment Plan

This plan targets Yurbrain’s first credible production deployment for a private/small-alpha rollout.

## Production Goal

Deploy Yurbrain so that:
- one real backend is live
- one real client surface is accessible
- persistence works
- logs and errors are visible
- a small trusted alpha cohort can use it safely

## Recommended Initial Deployment Architecture

### Frontend
- Web app on Vercel.
- Use web as the first production surface unless mobile is significantly further along.

### Backend API
Deploy `apps/api` to:
- Railway, Render, Fly.io, or similar
- or Vercel only if architecture fits (a dedicated backend host is usually cleaner)

### Database
- Postgres, hosted via one of:
  - Supabase
  - Neon
  - Railway Postgres
  - Render Postgres

### Storage / auth / AI secrets
- Environment variables managed per environment.
- No secrets committed in repo.

## Environment Strategy

Maintain at least three environments:
1. Local (development + agent execution)
2. Staging (integration testing + founder QA)
3. Production (real alpha users)

Do not skip staging.

## Deployment Checklist

## Phase 1 — Prep the Repo

Required before deployment:
- no critical in-memory state
- migrations are real
- seed not required for production runtime
- web client points to environment-based API URL
- API has health route
- env vars documented

Already implemented:
- `GET /health/live` — liveness probe
- `GET /health/ready` — readiness probe with DB connectivity check
- Environment-based config via `NHOST_PROJECT_ENV` and `apps/api/.env.example`
- Full deployment reference: `docs/DEPLOYMENT.md`

## Phase 2 — Database Setup

Tasks:
- create production Postgres instance
- create staging Postgres instance
- run migrations against staging first
- run migrations against production second

Must have:
- backup policy
- rollback awareness
- migration order documented

## Phase 3 — API Deployment

Tasks:
- deploy backend to staging
- verify:
  - health route
  - DB connection
  - migrations
  - AI env vars
  - CORS config for frontend
- deploy backend to production

Add monitoring at minimum:
- request logs
- boot failure logs
- uncaught exception logging
- AI failure logging

## Phase 4 — Web Deployment

Tasks:
- deploy web app to staging
- point staging frontend at staging API
- run end-to-end manual QA
- deploy production web
- point production frontend at production API

Verify:
- capture flow works
- feed loads
- item detail loads
- comments persist
- task/session flow works

## Phase 5 — Foundational Production Safeguards

Before inviting users, add:

### 1) Error reporting
- Sentry (or equivalent)

### 2) Basic analytics
Track:
- item created
- feed opened
- card opened
- comment created
- AI query submitted
- task created
- session started
- session finished

### 3) Rate limits / abuse protections
Even for alpha, protect:
- AI endpoints
- auth flows
- write-heavy routes

### 4) Authentication
If not already present, add a minimal auth system before opening alpha access.

## Phase 6 — Alpha Rollout Plan

### Wave 1
- founder only
- 1–3 days of real usage

### Wave 2
- 5–10 trusted users
- observe failures
- daily bug triage

### Wave 3
- 25–50 users
- begin retention and usefulness measurement

Do not broaden beyond that until:
- persistence is stable
- feed quality is acceptable
- AI does more help than harm

## Production Readiness Gates

Do not call Yurbrain production-ready until all are true:
- persistent state survives deploys/restarts
- staging exists
- migrations are reliable
- logs are visible
- one full user loop works in production
- auth is in place
- API URLs/envs are cleanly separated
- there is a rollback strategy

## Suggested Production Ticket Order

1. Add health/readiness routes
2. Add env validation
3. Provision staging DB
4. Provision production DB
5. Deploy API staging
6. Deploy web staging
7. Run staging QA
8. Add monitoring + analytics
9. Deploy production API
10. Deploy production web
11. Founder-only QA
12. Invite first alpha users

## Most Important Production Advice

For first production, optimize for **trust and continuity**, not scale and complexity.

That means:
- stable persistence
- understandable failures
- careful rollout
- no premature infra sprawl
