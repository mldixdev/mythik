---
id: concept-storage-table-versions
title: Storage — Table 1 `screen_versions`
kind: concept
sources: [docs/consumer/ai-context.md#storage-setup]
---

# Table 1 — `screen_versions` (opt-in)

Version history. Required only when using `*VersionedSpecStore`.

## Columns

| Column | Semantic type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | auto-increment integer, PK | NOT NULL | DB-managed | Surrogate PK; framework never writes |
| `screen_id` | short string (≤255) | NOT NULL | — | Spec doc identifier |
| `version` | integer | NOT NULL | — | Sequential per-`screen_id`; framework computes via `MAX(version) + 1` |
| `is_snapshot` | boolean | NOT NULL | `false` | `true` for full-spec rows, `false` for patch rows |
| `spec` | long string (≥1MB capacity) | NULL | — | JSON-encoded full spec; populated only when `is_snapshot = true` |
| `patches` | long string (≥1MB capacity) | NULL | — | JSON-encoded patch array; populated only when `is_snapshot = false` |
| `author` | short string (≤255) | NOT NULL | `'system'` | Provided via `--author` flag; bootstrapped to `'system'` for lazy v1 backfill |
| `source_type` | short string (≤50) | NOT NULL | `'push'` | Source channel (`push`, `patch`, etc.) |
| `description` | medium string (≤1000) | NULL | — | Optional description from `--description` flag |
| `created_at` | UTC timestamp | NOT NULL | NOW UTC | Set by DB on insert |

## Constraints

- `PRIMARY KEY (id)` — surrogate key on auto-increment
- `UNIQUE (screen_id, version)` — framework relies on per-screen
  uniqueness to compute next version

## Indexes (required for query performance)

- `(screen_id, version)` — supports `WHERE screen_id = ? ORDER BY version DESC`
- `(screen_id, version) WHERE is_snapshot = true` (partial index) —
  accelerates `loadVersion`'s nearest-snapshot lookup. Omit if target
  DB doesn't support partial indexes (correctness preserved, performance
  degrades on long histories).

## Related concepts

- [[@concept-storage-overview]]
- [[@concept-versioned-store]]
- [[@concept-versioning-snapshots-patches]]
- [[@cli-versioning-author]]

## Sources (raw)

- `docs/consumer/ai-context.md § Storage Setup → Table 1 — screen_versions`
