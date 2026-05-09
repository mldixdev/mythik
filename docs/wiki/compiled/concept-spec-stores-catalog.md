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
| `SqlSpecStore` | Generic SQL store over a `SqlDriver` |
| `SqlVersionedSpecStore` | Generic SQL store + version history |
| `SqlEnvironmentStore` | Generic SQL store + env promotions |
| `SqlServerSpecStore` | SQL Server compatibility wrapper |
| `SqlServerVersionedSpecStore` | SQL Server compatibility wrapper + version history |
| `SqlServerEnvironmentStore` | SQL Server compatibility wrapper + env promotions |

Supported SQL driver dialects: SQL Server, PostgreSQL, MySQL, and SQLite.

## Why split

The structural split keeps `mythik` browser-safe **by construction**:
browser bundles import the default entry, while Node hosts import
`mythik/server` for filesystem stores, SQL stores, and SQL adapters.

## Imports

```ts
// Browser-safe
import { SupabaseSpecStore, MemorySpecStore } from 'mythik';

// Node-only
import { FileSpecStore, SqlSpecStore, createSqlDriver } from 'mythik/server';

const driver = createSqlDriver({
  dialect: 'postgres',
  connection: process.env.DATABASE_URL!,
});

const store = new SqlSpecStore({ driver });
```

## Configurable table names

Default `'screens'`. Override via constructor — see
[[@concept-storage-custom-names]].

```ts
new SqlSpecStore({ driver, table: 'api_specs' })
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
