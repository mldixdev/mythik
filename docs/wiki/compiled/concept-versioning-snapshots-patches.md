---
id: concept-versioning-snapshots-patches
title: Versioning — snapshots + patch chain
kind: concept
sources: [docs/consumer/reference-doc.md#rule-83]
---

# Versioning — snapshots + patch chain

How `VersionedSpecStore` reconstructs an arbitrary version efficiently.

## Strategy

- v1 stores the **full spec** (snapshot).
- Subsequent versions store **RFC 6902 patches** (delta from previous).
- Every N versions (configurable, default 10), a fresh snapshot is stored
  to bound replay cost.

Reconstructing version X:
1. Find the **nearest snapshot at or before X**.
2. Apply patches sequentially up to X.

## Internals

`computePatches(before, after)` — generates RFC 6902 patches between two
docs. Used at `saveVersion` time when previous version is a snapshot or
patch row.

`applyPatches` — applies a patch array to a doc.

Source files: `packages/core/src/streaming/patch.ts` +
`packages/core/src/versioning/compute-patches.ts`.

## Structural diff (semantic)

`computeStructuralDiff(before, after)` produces `StructuralChange[]` with
kinds: `element-added`, `element-removed`, `prop-changed`, `action-changed`,
`section-changed`. **Type-aware**: screen specs diff elements/props, api
specs diff endpoints/catalogs at item level, app specs diff
navigation/tokens. Shows actual values:

```
prop content: "Send" → "Submit"
orderBy: added "anio DESC"
orderBy: removed (was "anio DESC")
```

Summary: `+2 elements, ~3 changes, -1 element`.

Used by `mythik history` for inline diffs. See [[@cli-history]].

## Related concepts

- [[@concept-versioned-store]]
- [[@cli-history]]
- [[@concept-rollback]]
- [[@cli-patch]] — RFC 6902 patches

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 83, 85`
