# Nhost Local Setup (From Scratch)

This guide explains how to run Nhost locally for Yurbrain migration work. Because Nhost stitches together multiple services (Hasura, Postgres, Auth, storage, functions), local development uses Docker + Nhost CLI orchestration.

## Prerequisites

- **Docker Desktop** installed and running.
- **Git** installed.
- **Node.js + pnpm** installed.

## 1) Install the Nhost CLI

```bash
sudo curl -L https://raw.githubusercontent.com/nhost/cli/main/get.sh | bash
```

If needed, install from Nhost CLI GitHub release binaries instead.

## 2) Initialize and start Nhost

From repo root:

```bash
nhost init
nhost up
```

- `nhost init` creates the `nhost/` folder (config, migrations, metadata).
- `nhost up` starts local services and prints service URLs.

## 3) Environment files

At minimum, provide root shared values in `.env` and app-level public examples:

- Root `.env`
- `apps/web/.env.local.example`
- `apps/mobile/.env.example`

Root keys include Nhost connection values (`NHOST_*`) plus public app keys (`NEXT_PUBLIC_*` and `EXPO_PUBLIC_*`) and Yurbrain runtime aliases (`YURBRAIN_*`).

## 4) Install Nhost packages

From repo root:

```bash
pnpm add -w @nhost/nhost-js
pnpm --filter web add @nhost/react @nhost/nhost-js
pnpm --filter mobile add @nhost/react @nhost/nhost-js
pnpm --filter web add @nhost/nextjs
```

## 5) Shared + app-local Nhost clients

Monorepo client scaffold:

- Shared package: `packages/nhost/src/client.ts`
- Web wrapper: `apps/web/src/lib/nhost.ts`
- Mobile wrapper: `apps/mobile/src/lib/nhost.ts`

Provider scaffolds:

- Web provider wrapper: `apps/web/app/providers.tsx`
- Mobile provider wrapper: `apps/mobile/src/providers/NhostProvider.tsx`


For migration cutover to standard Nhost migration/metadata folders, follow `docs/nhost-baseline-cutover-checklist.md`.

## 6) Existing `apps/api` strategy

Keep `apps/api` as a compatibility path during migration. Only remove or tighten legacy API routes after web and mobile parity is validated on Nhost-backed flows.
