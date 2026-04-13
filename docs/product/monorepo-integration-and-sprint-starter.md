
# Yurbrain Monorepo Integration Plan + Sprint Starter

## Goal
Unify the previously created asset packs into one clean monorepo structure so implementation can begin with minimal ambiguity and low rework risk.

---

## 1. Recommended monorepo structure

```text
yurbrain/
  apps/
    mobile/
      src/
        screens/
        navigation/
    web/
      src/
        pages/
        screens/
    api/
      src/
        routes/
        services/
        orchestration/
        repositories/
        jobs/

  packages/
    contracts/
      src/
        domain/
        ai/
        api/
    db/
      src/
        schema/
        migrations/
        repositories/
    ui/
      src/
        components/
        design/
        hooks/
    ai/
      src/
        prompts/
        runners/
        validators/
        contracts/
    client/
      src/
        api/
        hooks/
        query/

  docs/
    architecture/
    prompts/
    api/
    product/

  tooling/
    scripts/
```

---

## 2. How the current asset packs map into the monorepo

You currently have three asset groups:

1. `yurbrain_component_scaffolds`
2. `yurbrain_next_steps`
3. `yurbrain_build_assets`

### Merge target

#### From `yurbrain_component_scaffolds`
Move to:
- `packages/ui/src/components/*`
- `packages/ui/src/hooks/useRenderMode.ts`
- `packages/contracts/src/domain/*` (for shared types, after cleanup)

#### From `yurbrain_next_steps`
Move to:
- `packages/ui/src/design/*`
- `packages/client/src/api/*`
- `packages/client/src/hooks/*`
- `apps/mobile/src/previews/*` or `apps/web/src/previews/*`
- `apps/mobile/src/mocks/*` or `packages/ui/src/mocks/*`

#### From `yurbrain_build_assets`
Move to:
- `docs/architecture/object-model-v1.md`
- `docs/architecture/feed-logic-v1.md`
- `docs/architecture/ai-contracts-v1.md`
- `docs/architecture/api-routes-v1.md`
- `docs/product/ui-wireframe-spec.md`
- `docs/product/agent-task-pack.md`

---

## 3. File move map

### A. Contracts and shared types

| Current file | New location | Notes |
|---|---|---|
| `yurbrain_component_scaffolds/src/types/domain.ts` | `packages/contracts/src/domain/domain.ts` | Split enums and interfaces later if needed |
| `yurbrain_next_steps/src/api/contracts.ts` | `packages/contracts/src/api/api-contracts.ts` | Keep API DTOs separate from domain models |

### B. UI system

| Current file | New location | Notes |
|---|---|---|
| `yurbrain_component_scaffolds/src/components/capture/CaptureComposer.tsx` | `packages/ui/src/components/capture/CaptureComposer.tsx` | Keep prop-driven |
| `yurbrain_component_scaffolds/src/components/feed/FeedLensBar.tsx` | `packages/ui/src/components/feed/FeedLensBar.tsx` | |
| `yurbrain_component_scaffolds/src/components/feed/CommentComposer.tsx` | `packages/ui/src/components/feed/CommentComposer.tsx` | |
| `yurbrain_component_scaffolds/src/components/feed/FeedCard.tsx` | `packages/ui/src/components/feed/FeedCard.tsx` | |
| `yurbrain_component_scaffolds/src/components/brain/BrainItemDetail.tsx` | `packages/ui/src/components/brain/BrainItemDetail.tsx` | |
| `yurbrain_component_scaffolds/src/components/brain/ItemChatPanel.tsx` | `packages/ui/src/components/brain/ItemChatPanel.tsx` | |
| `yurbrain_component_scaffolds/src/components/tasks/*` | `packages/ui/src/components/tasks/*` | |
| `yurbrain_component_scaffolds/src/components/shared/*` | `packages/ui/src/components/shared/*` | |
| `yurbrain_next_steps/src/design/tokens.ts` | `packages/ui/src/design/tokens.ts` | |
| `yurbrain_next_steps/src/design/theme.ts` | `packages/ui/src/design/theme.ts` | |
| `yurbrain_component_scaffolds/src/hooks/useRenderMode.ts` | `packages/ui/src/hooks/useRenderMode.ts` | |

### C. Client API layer

| Current file | New location | Notes |
|---|---|---|
| `yurbrain_next_steps/src/api/client.ts` | `packages/client/src/api/client.ts` | |
| `yurbrain_next_steps/src/api/endpoints.ts` | `packages/client/src/api/endpoints.ts` | |
| `yurbrain_next_steps/src/hooks/useYurbrainApi.ts` | `packages/client/src/hooks/useYurbrainApi.ts` | |
| `yurbrain_next_steps/src/hooks/useFeed.ts` | `packages/client/src/hooks/useFeed.ts` | |
| `yurbrain_next_steps/src/hooks/useBrainItem.ts` | `packages/client/src/hooks/useBrainItem.ts` | |
| `yurbrain_next_steps/src/hooks/useMutations.ts` | `packages/client/src/hooks/useMutations.ts` | |

### D. Preview / mock setup

| Current file | New location | Notes |
|---|---|---|
| `yurbrain_next_steps/src/mocks/domain.ts` | `apps/mobile/src/previews/mocks/domain.ts` | Could also live under `packages/ui/src/mocks` |
| `yurbrain_next_steps/src/mocks/mockData.ts` | `apps/mobile/src/previews/mocks/mockData.ts` | |
| `yurbrain_next_steps/src/stories/FocusFeedPreview.tsx` | `apps/mobile/src/previews/FocusFeedPreview.tsx` | |
| `yurbrain_next_steps/src/stories/BrainItemPreview.tsx` | `apps/mobile/src/previews/BrainItemPreview.tsx` | |
| `yurbrain_next_steps/src/stories/TaskSessionPreview.tsx` | `apps/mobile/src/previews/TaskSessionPreview.tsx` | |
| `yurbrain_next_steps/src/stories/previewGuide.md` | `docs/product/preview-guide.md` | |

---

## 4. Recommended package boundaries

### `packages/contracts`
Owns:
- domain interfaces
- API request/response DTOs
- AI response envelopes
- enums

Should have **zero UI code**

### `packages/ui`
Owns:
- design tokens
- reusable components
- view-only hooks like render mode
- no network logic

### `packages/client`
Owns:
- API client
- endpoints
- React Query hooks
- no React Native UI components

### `apps/mobile`
Owns:
- app navigation
- screen composition
- local preview harness
- mobile-specific wrappers

### `apps/api`
Owns:
- route handlers
- service wiring
- orchestrators
- repositories
- job triggers

This separation minimizes rework because changing backend transport or AI routing should not require changing UI components.

---

## 5. Install commands

Assuming `pnpm` monorepo:

```bash
pnpm init
pnpm add -w typescript turbo eslint prettier
pnpm add -w -D @types/node
```

### Mobile app
```bash
pnpm create expo-app apps/mobile
```

### Web app
```bash
pnpm create next-app apps/web
```

### API app
```bash
mkdir -p apps/api
cd apps/api
pnpm init
pnpm add fastify zod
pnpm add -D typescript tsx @types/node
```

### Shared packages
```bash
mkdir -p packages/contracts packages/ui packages/client packages/db packages/ai
```

### UI + client dependencies
```bash
pnpm add react react-native @tanstack/react-query
```

### Database
Choose one:

#### Drizzle
```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

#### Prisma
```bash
pnpm add prisma @prisma/client
```

### Auth / infra (recommended later in sprint 2 or 3)
```bash
pnpm add @supabase/supabase-js
```

### Async jobs (later, not day 1)
```bash
pnpm add inngest
```

---

## 6. Suggested `package.json` workspace config

Root `package.json`:

```json
{
  "name": "yurbrain",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:mobile": "pnpm --filter mobile start",
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "lint": "turbo lint",
    "test": "turbo test",
    "build": "turbo build"
  }
}
```

Root `turbo.json`:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false
    },
    "lint": {},
    "test": {}
  }
}
```

---

## 7. First implementation sprint starter

This is the safest first implementation path.

### Sprint 0.5 — Repository bootstrap
Goal:
- monorepo exists
- packages compile
- CI/lint/test basics work

Tasks:
- create root workspace
- add TypeScript base config
- add path aliases or package exports
- add formatting/linting
- add shared contracts package
- add placeholder exports in ui/client packages

### Sprint 1 — Frozen foundations in code
Goal:
- source-of-truth structures are real

Tasks:
- move engineering docs into `/docs`
- implement `packages/contracts`
- implement `packages/db` schema
- generate migrations
- create `apps/api` skeleton
- create `apps/mobile` shell with tabs
- add preview screens wired to mock data only

### Sprint 2 — First real loop without AI
Goal:
- deterministic loop works

Tasks:
- BrainItem CRUD
- Thread + Message CRUD
- FeedCard persistence
- static feed endpoint from stored cards
- mobile screens wired to live API for non-AI flows
- create task manually from item or comment (temporary deterministic path)

### Sprint 3 — AI safely added
Goal:
- optional intelligence layered on top

Tasks:
- AI runner
- summarize endpoint
- item chat endpoint
- task conversion endpoint
- fallback handling
- artifact persistence

### Sprint 4 — Feed generation
Goal:
- real Focus feed loop

Tasks:
- candidate selector
- feed card generator
- ranking + diversity
- dismiss/snooze
- refresh triggers

---

## 8. Exact first commit plan

### Commit 1
`chore: bootstrap yurbrain monorepo workspace`

Include:
- root package.json
- turbo.json
- tsconfig base
- workspace packages/apps folders
- README

### Commit 2
`docs: add frozen architecture and product implementation docs`

Include:
- object-model-v1.md
- feed-logic-v1.md
- ai-contracts-v1.md
- api-routes-v1.md
- do-not-build-yet.md
- ui-wireframe-spec.md
- agent-task-pack.md

### Commit 3
`feat(contracts): add shared domain and api contract schemas`

Include:
- domain types
- API DTOs
- AI envelopes
- enums
- tests

### Commit 4
`feat(ui): add design tokens and core MVP component scaffolds`

Include:
- tokens/theme
- CaptureComposer
- FeedLensBar
- FeedCard
- CommentComposer
- BrainItemDetail
- ItemChatPanel
- TaskDetailCard
- ActiveSessionScreen

### Commit 5
`feat(previews): add mock data and mobile preview screens`

Include:
- mock data
- FocusFeedPreview
- BrainItemPreview
- TaskSessionPreview

### Commit 6
`feat(api): scaffold typed client and query hooks`

Include:
- API client
- endpoints
- React Query hooks

### Commit 7
`feat(db): add MVP schema and initial migrations`

Include:
- user
- brain_items
- item_artifacts
- item_threads
- thread_messages
- feed_cards
- tasks
- sessions
- events
- user_preferences

### Commit 8
`feat(api): add brain item, thread, and message CRUD routes`

This is the first truly interactive backend milestone.

---

## 9. Technical debt prevention rules for this integration step

### Do
- keep contracts package authoritative
- import types into UI/client from contracts, not duplicate them
- keep preview files isolated from production flows
- keep API client thin
- keep screen composition in apps, components in packages/ui

### Do not
- let mobile screens call fetch directly
- duplicate domain types in multiple places
- mix design tokens into random screen files
- move feed logic into UI components
- make preview files the source of truth

---

## 10. What to validate before writing feature code

Before feature development begins, verify:

- contracts package compiles cleanly
- packages can import each other correctly
- preview screens render from mocks
- API client builds independently of UI
- docs are committed and visible in repo
- agents are instructed not to change frozen contracts without approval

---

## 11. Best recommendation

The cleanest way to move forward is:

1. create the monorepo
2. move docs first
3. move contracts second
4. move UI scaffolds third
5. move preview harness fourth
6. add API layer fifth
7. only then start real backend CRUD

That order minimizes rework and keeps your coding agents constrained.

