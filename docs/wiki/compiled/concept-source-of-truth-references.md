---
id: concept-source-of-truth-references
title: Source-of-truth references
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Source-of-truth references

For cases where docs say "the framework enforces X" and you want the
canonical implementation.

| Rule / behavior | Canonical file |
|---|---|
| Identifier safety regex (`/^[a-zA-Z_][a-zA-Z0-9_.]*$/`, max 128 chars) | `packages/core/src/security/identifier-guard.ts` |
| Spec validation (root + element rules; emits `spec-row-literal`) | `packages/core/src/security/spec-validator.ts` |
| ApiSpec validation (catalogs, endpoints, auth, audit; emits `spec-crud-id-collision` + `spec-auth-domains-port`) | `packages/core/src/security/api-spec-validator.ts` |
| AppSpec validation | `packages/core/src/security/app-spec-validator.ts` |
| Built-in actions registry (full list + signatures + action-context shape) | `packages/core/src/actions/dispatcher.ts` |
| Expression handlers registry (full `$<name>` list) | `packages/core/src/expressions/handlers/index.ts` (re-exports) + per-handler files |
| Primitive prop schemas (`PRIMITIVE_PROP_SCHEMAS`) | `packages/core/src/renderer/prop-schemas.ts` |
| Reserved state paths (`/ui/selectedRow`, `/ui/loading`, etc.) | `packages/core/src/state/reserved-paths.ts` (constants source of truth) + `packages/core/src/state/store.ts` (storage mechanism) + `ai-context-runtime-semantics.md` (doc-side primary) |
| CLI lint rules catalog (4 rules in v0.1) | Coordinator: `packages/cli/src/lint/orchestrator.ts`. Spec-rule emitters: `packages/core/src/security/spec-validator.ts` + `api-spec-validator.ts`. Code-rule emitter: `packages/cli/src/lint/code-rules.ts`. Shared types: `packages/cli/src/lint/types.ts` |
| Versioning storage table writes | `packages/core/src/spec-stores/sqlserver-versioned.ts` + `supabase-versioned.ts` |
| Patch apply / compute (JSON Patch internals) | `packages/core/src/streaming/patch.ts` + `packages/core/src/versioning/compute-patches.ts` |
| Auth login body contract (`{ username, password }`) | `packages/server/src/auth/db-auth-provider.ts` + `packages/server/src/auth/jwt-strategy.ts` + `ai-context-api.md` (doc-side) |
| Query envelope shape (`{ data, total, page, pageSize, totals }`) | `packages/server/src/server.ts` (assembled in `registerEndpoint`'s query handler around lines 497-511) |

## Related concepts

- [[@concept-where-to-look]]
- [[@concept-debugging-runtime-pointers]]
- [[@concept-source-reading-misleading]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 3`
