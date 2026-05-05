---
id: concept-storage-postgres-jsonb
title: Storage — Postgres `jsonb` requirement
kind: concept
sources: [docs/consumer/ai-context.md#postgres--supabase-jsonb-for-spec-and-patches]
---

# Postgres / Supabase: `jsonb` for `spec` and `patches`

On Postgres-flavored backends (Supabase, plain Postgres), the JSON columns
**MUST be `jsonb`, not `text`**.

## Affected columns

- `screens.spec`
- `screen_versions.spec`
- `screen_versions.patches`

## Why

Supabase code path returns rows directly from PostgREST without defensive
parse:

- `screens.spec` — `supabase.ts:41` returns `rows[0].spec` directly. A
  `text` column would return a string and downstream consumers
  (`MythikInstance.getSpec`, `MythikRenderer`) would receive a stringified
  spec instead of an object.
- `screen_versions.spec` and `.patches` — Supabase versioned path consumes
  these as already-parsed objects from PostgREST. A `text` column would
  cause `applyPatches` / `structuredClone` to receive a string instead of
  an object — **silent corruption**.

## SQL Server is defensive

SQL Server stores parse `NVARCHAR(MAX)` defensively
(`typeof === 'string' ? JSON.parse(...) : raw` at `sqlserver.ts:58` and
`sqlserver-versioned.ts:133-135` and `:153`) and tolerate either form.
Postgres-flavored stores have **no such defense**.

## Verification

Verify the column type via INFORMATION_SCHEMA — see
[[@concept-storage-verification]].

## Related concepts

- [[@concept-storage-overview]]
- [[@concept-storage-postgres-triggers]]
- [[@concept-storage-verification]]

## Sources (raw)

- `docs/consumer/ai-context.md § Postgres / Supabase: jsonb for spec and patches`
