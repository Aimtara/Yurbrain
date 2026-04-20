# Client Transport Policy

This policy defines how UI code in Yurbrain is allowed to access backend data.

## Core rule

UI surfaces (`apps/web`, `apps/mobile`) must access data through `packages/client` domain methods only.

## Allowed

- Importing domain client entrypoints from `@yurbrain/client`.
- Calling stable domain methods such as:
  - `getCurrentUser`
  - `getFeed`
  - `createBrainItem`
  - `getBrainItem`
  - `addComment`
  - `planThis`
  - `startSession`
  - `finishSession`
  - `blockSession`
  - `summarizeProgress`
  - `getNextStep`
  - `getFounderReview`
  - `getFounderDiagnostics`

## Disallowed in UI code

- Direct REST `fetch` calls to API routes.
- Direct GraphQL queries/mutations from screens/components.
- Direct calls to Nhost Functions from screens/components.
- Importing low-level transport modules from `packages/client/src/api`, `packages/client/src/graphql`, or future `packages/client/src/functions` in UI surfaces.

## Why this is mandatory

1. Prevent transport coupling in screens.
2. Allow incremental REST -> GraphQL/Functions cutover without screen rewrites.
3. Keep web and mobile behavior aligned through one domain data layer.

## Enforcement checkpoints

1. During migration, each phase verifies web/mobile screen imports remain domain-client-only.
2. Any new UI data requirement must first add a domain client method.
3. Route/operation changes must be implemented in adapters, not in UI components.

## Migration note

`@yurbrain/client` root exports are now restricted to the stable surface (`createYurbrainClient`, `yurbrainClient`, provider/hook APIs, and base URL config). Low-level transport modules remain internal and must not be imported by UI surfaces.
