---
id: concept-storage-table-screens
title: Storage — Table 0 `screens`
kind: concept
sources: [docs/consumer/ai-context.md#storage-setup]
---

# Table 0 — `screens` (REQUIRED)

Current spec per `id`. Used by every adapter.

## Columns

| Column | Semantic type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | short string (≤255) | NOT NULL | — | Spec identifier; PK |
| `name` | short string (≤255) | NULL | — | Display name. Framework's INSERT populates with `id` value |
| `spec` | long string (≥1MB capacity) | NOT NULL | — | JSON-encoded current spec. SQL Server: `NVARCHAR(MAX)` text. **Postgres / Supabase MUST be `jsonb`** — see [[@concept-storage-postgres-jsonb]] |
| `version` | integer | NOT NULL | `1` | Incremented on every UPDATE. SQL Server: app-level. Postgres: via TRIGGER (see [[@concept-storage-postgres-triggers]]) |
| `is_active` | boolean | NOT NULL | `true` | Framework's INSERT sets `1`/`true`; UPDATE never touches it |
| `created_at` | UTC timestamp | — | — | OPTIONAL — framework does not read or write. If added, make `NOT NULL` with NOW UTC default |
| `updated_at` | UTC timestamp | NOT NULL | NOW UTC | Required. Updated on every UPDATE. SQL Server: app-level. Postgres: via TRIGGER |

## Constraints

- `PRIMARY KEY (id)` — required (every framework query filters by `id`)

## Indexes (RECOMMENDED, none required)

- `(is_active, id)` — useful for consumer queries filtering active
  screens. Framework's `list()` uses only `ORDER BY id`, so this is
  consumer-hygiene only.

## Related concepts

- [[@concept-storage-overview]]
- [[@concept-storage-postgres-jsonb]]
- [[@concept-storage-postgres-triggers]]
- [[@concept-spec-store-interface]]
- [[@concept-spec-stores-catalog]]

## Sources (raw)

- `docs/consumer/ai-context.md § Storage Setup → Table 0 — screens`
