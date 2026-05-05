---
id: concept-blob-layer
title: Blob layer v2 — preset + explicit
kind: concept
sources: [docs/consumer/ai-context.md#rule-53, docs/consumer/reference-doc.md#rules-205-209-219-220]
---

# Blob layer v2

Two mutually-exclusive forms for blob backgrounds — preset (curated) or
explicit (per-instance configuration).

## Preset form

```json
{
  "type": "blobs",
  "preset": "organic-duo",
  "palette": ["primary", "accent"],
  "motion": "drift-gentle",
  "blobOpacity": 0.4
}
```

| Field | Values |
|---|---|
| `preset` | `'organic-duo'` / `'organic-trio'` / `'circle-pair'` |
| `palette` | Array of `'primary'` / `'accent'` / hex strings |
| `motion` | `'drift-gentle'` / `'drift-fluid'` / `'drift-snappy'` / `'static'` |
| `blobOpacity` | Per-blob fill opacity default |

Hydrates curated compositions from `PRESET_SEEDS`.

## Explicit form

```json
{
  "type": "blobs",
  "blobs": [
    {
      "shape": "organic-1",
      "position": { "x": 0, "y": 0 },
      "size": { "width": 400, "height": 400 },
      "color": "primary",
      "opacity": 0.3,
      "blur": 20,
      "motion": { "drift": { ... }, "rotate": { ... }, "scale": { ... } }
    }
  ]
}
```

`shape` is one of 6 catalog entries (`organic-1..5`, `circle`) OR
`'custom-svg'` with `path` + `viewBox`.

See [[@concept-blob-shapes-catalog]] + [[@concept-blob-motion]].

## Layer-level vs per-blob opacity

**Two distinct opacity axes**:
- `BlobsLayerConfig.opacity` (`LayerCommonProps`) = layer-container
  wrapper alpha.
- `blobOpacity` (renamed from `BlobV2Config.opacity`) = per-blob fill
  default.

If both were named `opacity` at the same nesting level, they'd compose
multiplicatively (user writes `opacity: 0.4`, sees 0.16). Rename
prevents this.

## Custom-svg requirements

`shape: 'custom-svg'` requires non-empty `path` + `viewBox`. Dev: throws
with field-specific message. Prod: skips malformed blob + `console.warn`,
preserves app stability.

## Ambiguous config

`{ preset, blobs }` both set — prefers preset + dev-warn. Empty `palette: []`
falls back to `['primary']` + dev-warn.

## Related concepts

- [[@concept-blob-shapes-catalog]]
- [[@concept-blob-motion]]
- [[@concept-background-layer-kinds]]
- [[@concept-layer-background]]
- [[@concept-shape-animations]] — drives blob motion

## Sources (raw)

- `docs/consumer/ai-context.md § rule 53`
- `docs/consumer/reference-doc.md § rules 205-209, 219-220`
