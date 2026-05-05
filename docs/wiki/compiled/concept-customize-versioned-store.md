---
id: concept-customize-versioned-store
title: Customize — custom `VersionedSpecStore`
kind: concept
sources: [docs/consumer/WHERE-TO-LOOK.md]
---

# Customize — custom `VersionedSpecStore`

For custom DBs with version history.

## Read order

1. **`packages/core/src/versioning/types.ts`** — `VersionedSpecStore`,
   `EnvironmentStore` interfaces.
2. **`packages/core/src/spec-stores/memory-versioned.ts`** — simplest.
3. **`packages/core/src/spec-stores/sqlserver-versioned.ts`** +
   `supabase-versioned.ts` — production.
4. **`docs/consumer/ai-context.md § Storage Setup`** — the schema your DB
   needs.

## Reusable internals

Versioned stores extend a base store. Snapshot/patch logic lives in
`versioning/compute-patches.ts` + `streaming/patch.ts` and is **reusable**;
only the I/O is per-adapter.

## Related concepts

- [[@concept-versioned-store]]
- [[@concept-versioning-snapshots-patches]]
- [[@concept-storage-table-versions]]
- [[@concept-customize-spec-store]]

## Sources (raw)

- `docs/consumer/WHERE-TO-LOOK.md § Section 1 → custom VersionedSpecStore`
