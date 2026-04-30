Yurbrain Web (Next.js 15 + React 19 + TypeScript).

Architecture:
- Next.js app under `app/` with feature modules in `src/features/`
- Consumes `@yurbrain/client`, `@yurbrain/contracts`, `@yurbrain/nhost`, `@yurbrain/ui`
- All API routes proxied via same-origin rewrites in `next.config.ts` (target: `YURBRAIN_API_ORIGIN`)
- Nhost auth integration in `src/nhost/`

Proxied API routes: `/auth/*`, `/capture/*`, `/brain-items/*`, `/feed/*`, `/functions/*`, `/threads/*`, `/messages/*`, `/preferences/*`, `/tasks/*`, `/sessions/*`, `/explore/*`, `/ai/*`, `/health/*`, `/events`.

Quick start:
- `pnpm dev:web` — Next.js dev server on port 3000 (requires API running on 3001)
- `pnpm --filter web test` — production UX smoke tests
- `pnpm --filter web lint` — TypeScript type check

Environment: see `apps/web/.env.example` and `docs/DEPLOYMENT.md`.
