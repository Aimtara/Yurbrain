# Nhost Local Setup (Yurbrain)

This guide is the local-development workflow for running Yurbrain with Nhost services.
It covers Nhost CLI setup, env wiring, and how to run the existing monorepo dev scripts.

## Prerequisites

- Docker Desktop running (required for `nhost up`).
- Node.js + pnpm installed.
- Nhost CLI installed.

Install Nhost CLI (macOS/Linux):

```bash
sudo curl -L https://raw.githubusercontent.com/nhost/cli/main/get.sh | bash
```

## 1) Initialize and link Nhost project

From repo root:

```bash
nhost init
```

If this repo is already initialized, `nhost init` is a no-op.

Link to an existing remote project when needed:

```bash
nhost link
```

You can also link directly by project reference:

```bash
nhost link --project "<project-ref>"
```

## 2) Start local Nhost stack

```bash
nhost up
```

Keep this running in its own terminal.

After startup, note these values from CLI output:
- `NHOST_BACKEND_URL` (often `http://localhost:1337`)
- GraphQL/Auth/Storage/Functions URLs
- local anon/admin secrets (if shown)

## 3) Configure Yurbrain env files

From repo root:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
cp apps/api/.env.example apps/api/.env
```

Then fill values from `nhost up` output.

### Web (`apps/web/.env.local`)

- `NEXT_PUBLIC_NHOST_BACKEND_URL`
- `NEXT_PUBLIC_NHOST_GRAPHQL_URL`
- `NEXT_PUBLIC_NHOST_AUTH_URL`
- `NEXT_PUBLIC_NHOST_STORAGE_URL`
- `NEXT_PUBLIC_NHOST_FUNCTIONS_URL`
- `NEXT_PUBLIC_NHOST_ANON_KEY`

### Mobile (`apps/mobile/.env`)

- `EXPO_PUBLIC_NHOST_BACKEND_URL`
- `EXPO_PUBLIC_NHOST_GRAPHQL_URL`
- `EXPO_PUBLIC_NHOST_AUTH_URL`
- `EXPO_PUBLIC_NHOST_STORAGE_URL`
- `EXPO_PUBLIC_NHOST_FUNCTIONS_URL`
- `EXPO_PUBLIC_NHOST_ANON_KEY`

### API (`apps/api/.env`)

- `NHOST_BACKEND_URL`
- `NHOST_GRAPHQL_URL`
- `NHOST_AUTH_URL`
- `NHOST_STORAGE_URL`
- `NHOST_FUNCTIONS_URL`
- `NHOST_ANON_KEY`
- `NHOST_ADMIN_SECRET` (server-only; never use in web/mobile env files)

## 4) Run Yurbrain with existing dev scripts

In separate terminals from repo root:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

Notes:
- `pnpm dev:web` and `pnpm dev:mobile` are the canonical scripts.
- If `pnpm dev:api` hits the known `ts-node-dev` ESM mismatch, run:

```bash
pnpm --filter api exec tsx --watch src/index.ts
```

## 5) New contributor quick-start

```bash
pnpm install
nhost init
nhost link   # optional if using a remote project
nhost up
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
cp apps/api/.env.example apps/api/.env
# fill env values from nhost up output
pnpm reset && pnpm seed
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

## Local vs production env differences

- Local: usually `localhost` service URLs from `nhost up`.
- Production: Nhost cloud URLs and production secrets from deployment env.
- `NHOST_ADMIN_SECRET` is API-only in all environments.
- Web/mobile should only receive public env keys (`NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`).
