---
id: concept-blob-shapes-catalog
title: `BLOB_CATALOG` — 6 curated shapes
kind: concept
sources: [docs/consumer/reference-doc.md#rule-205]
---

# `BLOB_CATALOG`

Exported from `mythik`. `Record<CuratedBlobName, BlobShapeDef>` with
6 hand-curated entries.

## Shapes

| Name | Aesthetic |
|---|---|
| `organic-1` | Balanced rounded |
| `organic-2` | Elongated diagonal |
| `organic-3` | Asymmetric multi-lobe (all-cubic — no T-reflection cusps) |
| `organic-4` | Horizontal flowing ribbon |
| `organic-5` | Sharply asymmetric |
| `circle` | Geometric circle |

Each entry has `name`, `viewBox: '0 0 W H'`, and a valid SVG `path` closed
with `Z`.

## Custom user shapes

Use `shape: 'custom-svg'` (sentinel — NOT in the catalog map). Requires
`path` + `viewBox` per [[@concept-blob-layer]].

## Type surface

`BlobShapeName`, `CuratedBlobName`, `BlobShapeDef`, `BlobPreset`,
`BlobMotionPreset`, `BlobMotion`, `BlobInstance`, `BlobV2Config`,
`BlobRenderStyle`, `BlobSpec` — all exported from `mythik`.

## Related concepts

- [[@concept-blob-layer]]
- [[@concept-blob-motion]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 205-206`
