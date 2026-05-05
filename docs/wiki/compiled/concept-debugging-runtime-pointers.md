---
id: concept-debugging-runtime-pointers
title: Debugging runtime — source-file pointers
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Debugging runtime — source pointers

For "why is X happening?" questions, the following entry points trace
where the behavior originates. **Read the relevant
`ai-context-runtime-semantics.md` section first** — these source pointers
are the fallback.

## Common scenarios

| You see... | Trace through |
|---|---|
| Expression re-evaluates more than expected | `expressions/resolver.ts` → `state/store.ts` (subscriptions) → `derive/evaluator.ts` (if in derive) → `data/data-sources.ts` (if in dataSource) |
| Action runs in different order than dispatched | `actions/dispatcher.ts` (queue + tx orchestration) → `actions/transaction-engine.ts` → `actions/middleware.ts` |
| `fetch` action behaves unexpectedly (auth header, retry, error) | `fetch/framework-fetch.ts` (interceptor chain) → `fetch/interceptors/` (auth, retry, timeout, logging) |
| dataSource refresh fires/skips at surprising moment | `data/data-sources.ts` → `derive/evaluator.ts` (coordination) → `actions/dispatcher.ts` (`refreshDataSource`) |
| Form state diverges from spec | `forms/engine.ts` (lifecycle) + `forms/types.ts` (shape) → `state/store.ts` (form paths) |
| Renderer re-renders too eagerly/lazily | `MythikRenderer.tsx` → `renderer/engine.ts` + `renderer/deps.ts` + `renderer/lazy-paths.ts` → `primitives/<primitive>.tsx` |
| Server endpoint returns different envelope | `server/src/server.ts` — `createServer` (line 53), `registerEndpoint` (line 373), envelope (line 497-511) |
| Auth flow rejecting token | Server: `server.ts` (login/refresh routes 104-130) → `auth/db-auth-provider.ts` + `auth/jwt-strategy.ts` + `auth/middleware.ts`. Client: `auth/engine.ts` + `refresh-engine.ts`. Wire: `fetch/interceptors/auth.ts` |
| CRUD auto-route 404 / collision | `server.ts:373` (registerEndpoint) → `server.ts:549-686` (CRUD block) → `handler-loader.ts` → `crud-builder.ts` |
| Optimistic update flickers / rollbacks | `actions/transaction-engine.ts` → `streaming/patch.ts` → `streaming/compiler.ts` |
| `mythik push` reports wrong element count | `cli/commands/push.ts` → `cli/api.ts` → `spec-engine/handlers/<doctype>-handler.ts` (per-doctype `countElements`) |

## Doc-side first

For ANY of these — read the corresponding `ai-context-runtime-semantics.md`
section first. Source pointers are for cases where the docs leave a gap.

## Related concepts

- [[@concept-where-to-look]]
- [[@concept-expression-timing]]
- [[@concept-source-of-truth-references]]
- [[@concept-source-reading-misleading]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 2`
