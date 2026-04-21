# Nhost Local Setup (From Scratch)

This guide explains how to run Nhost locally for Yurbrain migration work. Because Nhost stitches together multiple services (Hasura, Postgres, Auth, storage, functions), you must run a local orchestrator via the Nhost CLI.

## Prerequisites

Before starting, make sure you have:

- **Docker Desktop** installed and running (required for local Nhost services).
- **Git** installed (required for migrations and metadata tracking).
- **Node.js + npm or yarn** installed (for frontend app integration).

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

## 4) Connect your frontend to local Nhost

Install the base SDK dependencies in your frontend package:

```bash
npm install @nhost/nhost-js graphql
```

Initialize the client:

```ts
import { NhostClient } from '@nhost/nhost-js';

const nhost = new NhostClient({
  backendUrl: 'http://localhost:1337'
});

const { session, error } = await nhost.auth.signIn({
  email: 'test@example.com',
  password: 'securepassword123'
});
```

Use the exact `backendUrl` printed by your local `nhost up` output.

## 5) Workflow after setup

- **Manage data** in Hasura Console (tables, relationships, permissions).
- **Track changes** by committing migration/metadata updates under `nhost/`.
- **Deploy** by pushing repository changes to your linked Nhost project workflow.

## Notes for this repository

- Yurbrain still has a working local Fastify + PGlite path for non-Nhost development.
- Use this Nhost setup guide when working on migration/cutover tasks described in `docs/nhost-migration-runbook.md`.
