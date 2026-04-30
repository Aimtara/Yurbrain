 # Client adapter boundary

 Yurbrain clients must keep product UI separate from transport/vendor details.

 ## Allowed layers

 - `apps/web/src/nhost/*` and `apps/mobile/src/nhost/*`: Nhost auth/session provider setup only.
 - `packages/nhost`: shared Nhost client factories, runtime config, and user-safe auth messages.
 - `packages/client/src/graphql/*`: Hasura GraphQL CRUD adapter.
 - `packages/client/src/api/*` and hooks/domain client: REST/function transport adapter.
 - `packages/ui`: vendor-neutral React components.

 ## Product UI rule

 Feature components in `apps/web/src/features/*`, `apps/mobile/src/features/*`, and `packages/ui/src/components/*` should call the Yurbrain client/domain APIs. They should not contain:

 - raw GraphQL operation strings,
 - Hasura-specific filters such as `_eq`,
 - `x-hasura-*` headers,
 - direct Nhost SDK calls,
 - storage/admin secrets.

 ## Current Nhost exception

 Web and mobile auth screens call app-local Nhost hooks because authentication is the adapter boundary. These hooks wrap `@yurbrain/nhost`, normalize errors, and synchronize the Yurbrain client identity. This exception does not permit product features to call Nhost directly.

 ## GraphQL/Hasura containment

 Hasura-specific GraphQL is accepted only in `packages/client/src/graphql/*`. That adapter:

 - derives current user from configured session identity,
 - scopes queries by the current user,
 - falls back to REST/function routes for computed surfaces where appropriate.

 ## Adding new client functionality

 1. Add or update API contracts in `@yurbrain/contracts`.
 2. Add REST/function helpers in `packages/client`.
 3. Add GraphQL CRUD adapter code only when it is a simple user-owned CRUD path.
 4. Expose a vendor-neutral method from the domain client.
 5. Use that method from web/mobile UI.

 Computed surfaces such as Focus Feed, Founder Review, AI synthesis, and session helper flows should remain behind API/function endpoints rather than moving business logic into UI.
