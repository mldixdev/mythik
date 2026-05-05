---
id: concept-versioned-store
title: VersionedSpecStore — snapshots + patch chain
kind: concept
sources: [docs/consumer/reference-doc.md#rules-82-89]
---

# VersionedSpecStore

Extends `SpecStore` with versioning. **Backward compatible** — `load(id)`
still returns the current spec; `save(id, doc)` still works.

## Added methods

```ts
saveVersion(id, doc, meta): Promise<void>
loadVersion(id, version): Promise<unknown>
listVersions(id, limit?): Promise<VersionMeta[]>
currentVersion(id): Promise<number>
```

## Activation

`mythik push --author <name>` and `mythik patch --author <name>` activate
versioning automatically. Without `--author`, commands work as before
(no versioning).

## Snapshots + patch chain

- v1 stores the **full spec**.
- Subsequent versions store **RFC 6902 patches**.
- Every N versions (configurable, default 10) a full snapshot is stored.
- Reconstructing version X = nearest snapshot + apply patches.
- `computePatches(before, after)` generates patches; `applyPatches`
  applies them.

## Lazy bootstrap

First versioned save on an existing spec with no history automatically
creates v1 (snapshot of current spec), then saves the change as v2. **No
migration script needed.**

## Implementations

- `MemoryVersionedSpecStore` — in-memory
- `SqlServerVersionedSpecStore` — `mythik/server`
- `SupabaseVersionedSpecStore` — `mythik` (PostgREST)

## Custom implementation

See `concept-customize-versioned-store.md` for the recipe.

## Related concepts

- [[@concept-storage-table-versions]]
- [[@concept-versioning-snapshots-patches]]
- [[@cli-versioning-author]]
- [[@cli-history]]
- [[@concept-rollback]]
- [[@concept-environment-store]]
- [[@concept-customize-versioned-store]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 82-89`
