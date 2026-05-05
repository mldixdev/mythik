---
id: concept-customize-spec-store
title: Customize — write a custom `SpecStore`
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Customize — write a custom `SpecStore`

For e.g. MongoDB, DynamoDB, etc.

## Read order

1. **`packages/core/src/spec-engine/types.ts`** — `SpecStore` interface
   (`load`, `save`, `list`, `delete`).
2. **`packages/core/src/spec-stores/memory.ts`** — simplest reference.
3. **`packages/core/src/spec-stores/sqlserver.ts`** + `supabase.ts` —
   production references (connection pooling, identifier safety, JSON
   handling).

## What to do

The interface is 4 methods. Memory store is the readable canonical
implementation. SQL Server / Supabase show production patterns.

## Identifier safety

If your store interpolates identifiers into raw strings (table names,
column names), reuse the framework's `assertValidIdentifier` —
`packages/core/src/security/identifier-guard.ts`. Regex
`/^[a-zA-Z_][a-zA-Z0-9_.]*$/`, max 128 chars.

## Related concepts

- [[@concept-spec-store-interface]]
- [[@concept-spec-stores-catalog]]
- [[@concept-customize-versioned-store]]
- [[@concept-where-to-look]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 1 → custom SpecStore`
