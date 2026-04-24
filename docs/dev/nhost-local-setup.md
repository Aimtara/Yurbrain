# Nhost Local Setup (From Scratch)

This guide explains how to run Nhost locally for Yurbrain migration work. Because Nhost stitches together multiple services (Hasura, Postgres, Auth, storage, functions), you must run a local orchestrator via the Nhost CLI.

## Prerequisites

Before starting, make sure you have:

- **Docker Desktop** installed and running (required for local Nhost services).
- **Git** installed (required for migrations and metadata tracking).
- **Node.js + pnpm** installed (for frontend app integration).

## 1) Install the Nhost CLI

The CLI manages your local Nhost stack, migration files, and Hasura metadata.

macOS / Linux:

```bash
sudo curl -L https://raw.githubusercontent.com/nhost/cli/main/get.sh | bash
```

If you are on Windows (or prefer another install flow), use the binaries from Nhost CLI GitHub releases.

## 2) Initialize Nhost in your repository

From your project root, run:

```bash
nhost init
```

This creates an `nhost/` directory containing configuration, migrations, and metadata.

It also generates a `.secrets` file. Keep `.secrets` out of version control by ensuring it is included in `.gitignore`.

## 3) Start local Nhost services

With Docker running, start the local stack:

```bash
nhost up
```

On first boot, image pulls can take a few minutes.

After startup, the CLI prints local service URLs. The key one for schema and GraphQL inspection is the Hasura Console (commonly `http://localhost:9695`).

## 4) Environment files

At minimum, provide root shared values in `.env` and app-level public examples:

- Root `.env`
- `apps/web/.env.local.example`
- `apps/mobile/.env.example`

Root keys include Nhost connection values (`NHOST_*`) plus public app keys (`NEXT_PUBLIC_*` and `EXPO_PUBLIC_*`) and Yurbrain runtime aliases (`YURBRAIN_*`).

## 5) Install Nhost packages

From repo root:

```bash
pnpm add -w @nhost/nhost-js
pnpm --filter web add @nhost/react @nhost/nhost-js @nhost/nextjs
pnpm --filter mobile add @nhost/react @nhost/nhost-js
```

## 6) Connect your frontend to local Nhost

The `@yurbrain/nhost` shared package provides an env-driven client factory. App-specific wrappers live at:

- Shared package: `packages/nhost/src/client.ts`
- Web wrapper: `apps/web/src/nhost/client.ts`
- Mobile wrapper: `apps/mobile/src/nhost/client.ts`

Provider scaffolds:

- Web provider wrapper: `apps/web/src/nhost/provider.tsx`
- Mobile provider wrapper: `apps/mobile/src/nhost/provider.tsx`

Use the exact `backendUrl` printed by your local `nhost up` output.

## 7) Workflow after setup

- **Manage data** in Hasura Console (tables, relationships, permissions).
- **Track changes** by committing migration/metadata updates under `nhost/`.
- **Deploy** by pushing repository changes to your linked Nhost project workflow.

For migration cutover to standard Nhost migration/metadata folders, follow `docs/nhost-baseline-cutover-checklist.md`.

## 8) Existing `apps/api` strategy

Keep `apps/api` as a compatibility path during migration. Only remove or tighten legacy API routes after web and mobile parity is validated on Nhost-backed flows.

## Notes for this repository

- Yurbrain still has a working local Fastify + PGlite path for non-Nhost development.
- Use this Nhost setup guide when working on migration/cutover tasks described in `docs/nhost-migration-runbook.md`.
