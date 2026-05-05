---
id: concept-storage-table-environments
title: Storage — Table 2 `screen_environments`
kind: concept
sources: [docs/consumer/ai-context.md#storage-setup]
---

# Table 2 — `screen_environments` (opt-in)

Environment promotions. Required only when using `*EnvironmentStore`.

## Columns

| Column | Semantic type | Nullable | Default | Notes |
|---|---|---|---|---|
| `screen_id` | short string (≤255) | NOT NULL | — | PK part 1 |
| `environment` | short string (≤100) | NOT NULL | — | PK part 2 (`dev`, `staging`, `prod`, etc.) |
| `version` | integer | NOT NULL | — | Promoted spec version (logical reference to `screen_versions.version`; not enforced as FK in v0.1.0) |
| `promoted_at` | UTC timestamp | NOT NULL | NOW UTC | Set by DB on insert; UPDATE on re-promotion |
| `promoted_by` | short string (≤255) | NOT NULL | `'system'` | Author who promoted |

## Constraints

- `PRIMARY KEY (screen_id, environment)` — one promotion record per
  `(spec, env)` pair; re-promote upserts via MERGE/UPSERT

## No triggers needed

This table is append-only / upsert-on-PK; the framework writes all columns
explicitly on each INSERT/UPSERT.

## Related concepts

- [[@concept-storage-overview]]
- [[@concept-environment-store]]
- [[@concept-promote-gate]]

## Sources (raw)

- `docs/consumer/ai-context.md § Storage Setup → Table 2 — screen_environments`
