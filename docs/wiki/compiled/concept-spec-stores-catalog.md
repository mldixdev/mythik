---
id: concept-spec-stores-catalog
title: Spec stores catalog
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#54-specstore-layering--save-vs-saveversion-vs-cli-patch]
---

# Spec stores catalog

## Browser-safe (`mythik`)

| Store | Purpose |
|---|---|
| `MemorySpecStore` | In-memory; testing |
| `MemoryVersionedSpecStore` | + version history |
| `MemoryEnvironmentStore` | + env promotions |
| `SupabaseSpecStore` | Supabase (REST API; no `@supabase/supabase-js` dep) |
| `SupabaseVersionedSpecStore` | + version history |
| `SupabaseEnvironmentStore` | + env promotions |

## Node-only (`mythik/server`)

| Store | Purpose |
|---|---|
| `FileSpecStore` | Local filesystem (`fs`) |
| `SqlServerSpecStore` | SQL Server (via `mssql`) |
| `SqlServerVersionedSpecStore` | + version history |
| `SqlServerEnvironmentStore` | + env promotions |

## Why split

Pre-v0.1.0 shape pulled `mssql` (Node-only) and `fs` into any browser
bundle that imported `mythik`. v0.1.0 structural split makes
`mythik` browser-safe **by construction** — no bundler stubs

## Imports

```ts
// Browser-safe
import { SupabaseSpecStore, MemorySpecStore } from 'mythik';

// Node-only
import { SqlServerSpecStore, FileSpecStore } from 'mythik/server';
```

## Configurable table names

Default `'screens'`. Override via constructor — see
[[@concept-storage-custom-names]].

```ts
new SqlServerSpecStore({ ..., table: 'api_specs' })
new SupabaseSpecStore({ ..., table: 'api_specs' })
```

## Related concepts

- [[@concept-spec-store-interface]]
- [[@concept-versioned-store]]
- [[@concept-environment-store]]
- [[@concept-package-layout]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 5.4` (last paragraph)
- ` § Breaking: Node-only spec stores moved`
