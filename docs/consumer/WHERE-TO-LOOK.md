# WHERE-TO-LOOK — Mythik framework source navigation

This file maps **"I need to understand or customize X"** to which framework source file you (or your AI assistant) should read. It is a fallback for cases the rest of `docs/consumer/` does not fully cover.

## When to use this file

**Use it when:**

1. You've checked the relevant `ai-context-*.md` and `reference-doc.md` and the answer is not there.
2. You are doing **deep customization that goes beyond the documented extension points** (custom actions and custom `SpecStore`s are first-class; custom plugins follow the auth pattern but reach into framework internals; custom server middleware is plain Express + the framework's chain shape).
3. You are **debugging a runtime behavior** that the docs describe at the surface but you need the underlying mechanism (e.g., "why does this expression re-evaluate twice?", "in what order do dataSources fire?").

**Do NOT use it for:**

- Spec syntax, expressions, primitives, actions catalog → `ai-context.md` + companions.
- Rule lookup → `reference-doc.md`.
- ApiSpec / server contract surface → `ai-context-api.md`.
- Runtime behavior reference (timing matrix, reserved state paths, store coordination) → `ai-context-runtime-semantics.md`. **Read this before reaching for source.**
- Routine edits to an existing persisted spec. Use the CLI loop instead: `mythik manifest <id>` -> `mythik elements <id> <ids>` -> `mythik patch <id> --from-file patch.json` -> verify. Source reading is not a substitute for inspecting the live persisted spec.

## How source paths in this file work

Paths are relative to the framework repo root and use the layout the framework publishes in.

- **In the framework repo (or unpacked tarball):** `packages/<package>/src/<path>` — TypeScript source. Authoritative for behavior questions.
- **In `node_modules/<public-mythik-package>/`:** the published artifact ships `dist/` only (compiled `.js` + `.d.ts`). `.d.ts` is enough for type-shape questions; for behavior questions, fetch the `src/` from the GitHub repo or the unpacked tarball. Public package names are unscoped (`mythik`, `mythik-react`, `mythik-cli`, and `mythik-server`). React Native work is a repository preview track, not part of the initial npm publish surface.

When in doubt, prefer reading `src/`. `dist/` is generated and may obscure intent (minified, stripped comments, transpiled control flow).

## Section 1 — Customizing the framework

| You want to write... | Read (in this order) | Why |
|---|---|---|
| **A custom action** (callable from spec via `{ action: 'myAction', params: {...} }`) | `packages/core/src/actions/dispatcher.ts` (built-in actions registry + dispatch flow + action-context shape) → spec's `customActions` config in `ai-context.md § Actions` | Custom actions register through the same dispatcher used by built-ins. Reading the built-in implementations (e.g., `setState`, `fetch`, `navigate`) gives the canonical pattern. |
| **A custom `SpecStore`** (e.g., MongoDB, DynamoDB) | `packages/core/src/spec-engine/types.ts` (`SpecStore` interface) → `packages/core/src/spec-stores/memory.ts` (simplest reference) → `packages/core/src/spec-stores/sqlserver.ts` + `supabase.ts` (production references) | The interface is 4 methods (`load`, `save`, `list`, `delete`). The memory store is the readable canonical implementation. SQL Server / Supabase show production patterns (connection pooling, identifier safety, JSON handling). |
| **A custom `VersionedSpecStore`** (custom DB with version history) | `packages/core/src/versioning/types.ts` (`VersionedSpecStore`, `EnvironmentStore` interfaces) → `packages/core/src/spec-stores/memory-versioned.ts` (simplest) → `packages/core/src/spec-stores/sqlserver-versioned.ts` + `supabase-versioned.ts` (production) → `docs/consumer/ai-context.md § Storage Setup` for the schema your DB needs | Versioned stores extend a base store. Snapshot/patch logic lives in `versioning/compute-patches.ts` + `streaming/patch.ts` and is reusable; only the I/O is per-adapter. |
| **A custom plugin** (auth-style cross-cutting feature) | `packages/core/src/plugins/loader.ts` (`PluginLoader` shape + plugin registration) → `packages/core/src/auth/engine.ts` + `auth/refresh-engine.ts` + `auth/persistence.ts` + `auth/cross-tab.ts` (auth as the canonical plugin example) → `packages/react/src/MythikApp.tsx` (`onPlugins` integration point) | Auth is the canonical plugin example. Plugins register actions, expose context, and can wrap fetch. |
| **A custom primitive** (Layer 3 element) | `docs/consumer/ai-context-custom-elements.md` (start here — full Layer 3 contract is documented) → `packages/react/src/primitives/*.tsx` (built-in React primitive components — show the prop-shape contract the renderer wires up) → `packages/core/src/renderer/prop-schemas.ts` (`PRIMITIVE_PROP_SCHEMAS` source-of-truth) → `packages/react/src/MythikRenderer.tsx` + `packages/core/src/renderer/engine.ts` (where state flows into a primitive's props, if the prop-shape contract is not enough) | Layer 3 authoring is the most-documented customization surface; you mostly should not need source. The React `primitives/` files are presentational — they receive bound props from the renderer; they do NOT subscribe to state directly. |
| **A custom validator rule** (extends `mythik validate`) | `packages/core/src/security/spec-validator.ts` (spec-level rules) + `packages/core/src/security/api-spec-validator.ts` (ApiSpec rules) + `packages/core/src/security/app-spec-validator.ts` (AppSpec rules) | Not officially extensible in v0.1 — these files are the canonical implementations if you need to fork or contribute upstream. |
| **A custom CLI lint rule** | Spec rules live in core (`packages/core/src/security/spec-validator.ts` for `spec-row-literal`; `packages/core/src/security/api-spec-validator.ts` for `spec-crud-id-collision` + `spec-auth-domains-port`) and surface via the CLI through `packages/cli/src/lint/orchestrator.ts`. Code rules live in `packages/cli/src/lint/code-rules.ts` (e.g., `code-store-save-bypass`). `packages/cli/src/lint/types.ts` carries the shared `LintFinding` shape. | Not officially extensible in v0.1; reading these is for understanding rule shape, contributing upstream, or forking. |
| **A custom server middleware** (`mythik-server`) | `packages/server/src/server.ts` (`createServer` — full Express middleware chain composition: CORS, body parser, auth, error handler, plus per-endpoint registration in `registerEndpoint`) → `packages/server/src/middleware/cors.ts` + `middleware/error-handler.ts` (existing chain-level middleware) → `packages/server/src/auth/middleware.ts` (canonical request-gating middleware shape) | Server middleware uses the standard Express `(req, res, next)` shape; `server.ts` is where the chain is assembled. |
| **A custom expression handler** (e.g., `$myCustom`) | Not officially extensible in v0.1. Source: `packages/core/src/expressions/handlers/` shows the existing handler shape. Use `customActions` instead if your need is action-shaped. | Expression-handler extensibility is a v0.2+ candidate. Document need at issue tracker. |

## Section 2 — Debugging runtime behavior

For each "why is X happening?" question, the following entry points trace where the behavior originates.

| You see... | Trace through | What to look for |
|---|---|---|
| **An expression re-evaluates more than expected** | `packages/core/src/expressions/resolver.ts` → `packages/core/src/state/store.ts` (subscription engine) → `packages/core/src/derive/evaluator.ts` + `derive/topo-sort.ts` if expression is in a derive path → `packages/core/src/data/data-sources.ts` if in a dataSource | Expression timing matrix in `ai-context-runtime-semantics.md` is the doc-side answer. Source confirms when docs leave a gap. |
| **An action runs in a different order than I dispatched** | `packages/core/src/actions/dispatcher.ts` (dispatch queue + tx orchestration) → `packages/core/src/actions/transaction-engine.ts` (transaction flow for optimistic updates) → `packages/core/src/actions/middleware.ts` (action middleware chain) | Dispatcher resolves actions sequentially per dispatch but can interleave across dispatches via fetch/await. Transaction engine handles optimistic apply + reconcile + rollback. |
| **A `fetch` action behaves unexpectedly** (auth header, retry, error mapping) | `packages/core/src/fetch/framework-fetch.ts` (interceptor chain entry) → `packages/core/src/fetch/interceptors/` (per-concern files: `auth.ts`, `retry.ts`, `timeout.ts`, `logging.ts`) | Each interceptor has a single responsibility. Auth interceptor does hostname matching against `auth.authDomains` (string[]) — see `interceptors/auth.ts`. |
| **A dataSource refresh fires/skips at a surprising moment** | `packages/core/src/data/data-sources.ts` (DataSources engine) -> `packages/core/src/derive/evaluator.ts` for derive coordination -> `actions/dispatcher.ts` for the `refreshDataSource` built-in action | DataSources fetch against state changes matching declared `inputs`. |
| **A form's state diverges from what the spec declared** | `packages/core/src/forms/engine.ts` (form lifecycle) + `packages/core/src/forms/types.ts` (form state shape) → `packages/core/src/state/store.ts` (form state paths) | Form lifecycle is built on bindState + validation rules. Lazy form state shape only materializes paths that exist in the spec. |
| **The renderer re-renders too eagerly or too lazily** | `packages/react/src/MythikRenderer.tsx` (top-level React entry) → `packages/core/src/renderer/engine.ts` (framework-side renderer logic) + `packages/core/src/renderer/deps.ts` (dependency tracking) + `packages/core/src/renderer/lazy-paths.ts` (path materialization) → `packages/react/src/primitives/<primitive>.tsx` (per-primitive React component) | Renderer subscribes to state slices used by a primitive's bound props; only those changes re-render. |
| **A server endpoint returns a different envelope than expected** | `packages/server/src/server.ts` — the canonical request-handling logic. `createServer` (line 53) composes the middleware chain; `registerEndpoint` (line 373) registers each spec endpoint as Express routes; query-result envelope (`{ data, total, page, pageSize, totals }`) is assembled in the query-handler block around line 497-511. SQL helpers used by that block live in `query-engine.ts` (`buildPaginatedQuery`, `buildCountQuery`, `buildTotalsQuery`); they do NOT define the envelope themselves. | Server contracts are documented in `ai-context-api.md` + `ai-context-runtime-semantics.md`. Source confirms field-by-field. |
| **Auth flow is rejecting a token / not propagating user state** | Server side: `packages/server/src/server.ts` (login + refresh route registration at lines 104-130 — `app.post('/api/auth/login')` and `/api/auth/refresh`) → `packages/server/src/auth/db-auth-provider.ts` (login business logic — username/password verification) + `auth/jwt-strategy.ts` (token issuance + verification) + `auth/middleware.ts` (request-gating middleware applied per endpoint). Client side: `packages/core/src/auth/engine.ts` + `auth/refresh-engine.ts` (auth state + token refresh). Wire-level: `packages/core/src/fetch/interceptors/auth.ts` (Authorization header attach + hostname match against `authDomains`). | The login body contract is documented in `ai-context-api.md`. The hostname matcher uses `auth.authDomains: string[]` (flat array of hostname strings). |
| **A CRUD auto-route returns 404 / collides with a custom endpoint** | `packages/server/src/server.ts` — `registerEndpoint` (line 373) is where each `endpoint.query` / `endpoint.handler` / `endpoint.crud` block becomes Express routes (CRUD route registration around line 549-686). The `for (const [, endpointConfig] of Object.entries(spec.endpoints))` loop near line 253 iterates the spec's endpoints map. → `packages/server/src/handler-loader.ts` (filesystem discovery of custom handler modules + `validateHandlerRefs`) → SQL string-builder helpers used by the CRUD block live in `crud-builder.ts` (`buildInsertQuery`, `buildUpdateQuery`, `buildDeleteQuery`). | Spec-side collision detection (e.g., `path` ending in `:id` while `crud` is set) surfaces during spec validation (`api-spec-validator.ts`) — see rule 248 + lint rule `spec-crud-id-collision`. |
| **An optimistic update flickers / rollbacks unexpectedly** | `packages/core/src/actions/transaction-engine.ts` (transaction flow) → `packages/core/src/streaming/patch.ts` (JSON Patch apply / revert) → `packages/core/src/streaming/compiler.ts` (patch compilation) | Reconciliation runs the server response against the optimistic apply; mismatches trigger rollback. |
| **`mythik push` reports a different element count than my spec has** | `packages/cli/src/commands/push.ts` (push entry — calls `handler.countElements(doc)`) → `packages/cli/src/api.ts` (`runPush` programmatic API) → `packages/core/src/spec-engine/handlers/screen-handler.ts` + `app-handler.ts` + `api-handler.ts` (per-doctype `countElements` implementations — this is where the count actually originates) | `elementCount` comes from `DocumentHandler.countElements`, implemented per-doctype, not raw JSON keys. The spec-validator's element walk is separate (used for lint-rule emission, not counting). |

## Section 3 — Source-of-truth references

For cases where docs say "the framework enforces X" and you want the canonical implementation:

| Rule / behavior | Canonical file |
|---|---|
| Identifier safety regex (`/^[a-zA-Z_][a-zA-Z0-9_.]*$/`, max 128 chars) | `packages/core/src/security/identifier-guard.ts` |
| Spec validation (root + element rules; emits `spec-row-literal` lint finding) | `packages/core/src/security/spec-validator.ts` |
| ApiSpec validation (catalogs, endpoints, auth, audit; emits `spec-crud-id-collision` + `spec-auth-domains-port`) | `packages/core/src/security/api-spec-validator.ts` |
| AppSpec validation | `packages/core/src/security/app-spec-validator.ts` |
| Built-in actions registry (full list + signatures + action-context shape) | `packages/core/src/actions/dispatcher.ts` |
| Expression handlers registry (full `$<name>` list) | `packages/core/src/expressions/handlers/index.ts` (re-exports) + per-handler files in the same directory (`state.ts`, `cond.ts`, `template.ts`, `math.ts`, etc.) |
| Primitive prop schemas (`PRIMITIVE_PROP_SCHEMAS`) | `packages/core/src/renderer/prop-schemas.ts` |
| Reserved state paths (`/ui/selectedRow`, `/ui/loading`, etc.) | `packages/core/src/state/reserved-paths.ts` (constants source of truth) + `packages/core/src/state/store.ts` (storage mechanism) + `ai-context-runtime-semantics.md` (doc-side primary reference) |
| CLI lint rules catalog (4 rules in v0.1) | Coordinator: `packages/cli/src/lint/orchestrator.ts`. Spec-rule emitters: `packages/core/src/security/spec-validator.ts` (`spec-row-literal`) + `api-spec-validator.ts` (`spec-crud-id-collision`, `spec-auth-domains-port`). Code-rule emitter: `packages/cli/src/lint/code-rules.ts` (`code-store-save-bypass`). Shared types: `packages/cli/src/lint/types.ts`. |
| Versioning storage table writes (column lists, INSERT/UPSERT statements) | `packages/core/src/spec-stores/sqlserver-versioned.ts` + `supabase-versioned.ts` (line ranges referenced from `ai-context.md § Storage Setup`) |
| Patch apply / compute (JSON Patch internals) | `packages/core/src/streaming/patch.ts` + `packages/core/src/versioning/compute-patches.ts` |
| Auth login body contract (`{ username, password }`) | `packages/server/src/auth/db-auth-provider.ts` + `packages/server/src/auth/jwt-strategy.ts` + `ai-context-api.md` (doc-side) |
| Query envelope shape (`{ data, total, page, pageSize, totals }`) | `packages/server/src/server.ts` (assembled in `registerEndpoint`'s query handler around lines 497-511; the SQL helpers in `query-engine.ts` produce the inputs to that envelope but do not define it) |

## Section 4 — When source-reading is the wrong tool

A few cases where reading source is **actively misleading**:

- **`packages/*/dist/`** — compiled output. Always read `src/` instead. `dist/` is regenerated on every `pnpm build` and obscures intent.
- **`packages/*/tests/`** — test fixtures often use internal hooks (e.g., `MemorySpecStore` constructors with seed data, mocked `loadTypeScript`) that are not part of the public API. Useful for understanding behavior under test, NOT as a guide to how consumers should use the framework.
- **`vendor.d.ts` files** — third-party type re-exports for adapters (`mssql`, `@supabase/supabase-js`). Not Mythik API.
- **`packages/*/src/index.ts` re-exports** — these declare the public surface but contain no behavior. For "how does X work?" questions, follow the import to the actual implementation file.
- **`packages/core/src/auth/` and other framework-internal plugin-style features** — the auth subsystem is the canonical plugin example, but its *internals* (engine.ts, refresh-engine.ts, persistence.ts, cross-tab.ts) can change between framework versions. Treat as reference for *shape* of a plugin, not as stable extension contract for the auth-plugin's own internals.

## Reporting gaps in this map

If you needed to read a source file that this map did not anticipate, that is a signal that either (a) the relevant doc in `docs/consumer/` should cover it directly, or (b) this map needs an entry. Both are valid framework-feedback signals — record them in your project's issue tracker or open a docs PR against the framework repo.
