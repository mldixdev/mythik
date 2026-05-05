---
id: concept-background-layer-kinds
title: Background layer kinds
kind: concept
sources: [docs/consumer/reference-doc.md#rules-171-176-217]
---

# Background layer kinds

`LayerConfig` union has 6 variants. Each carries `LayerCommonProps`
(`opacity?`, `blendMode?`, `zIndex?`).

## Kinds

| Kind | Use |
|---|---|
| `solid` | Single color |
| `gradient` | Linear / radial / conic. See below. |
| `pattern` | Grid / dots / diagonal / iso / crosshatch / chevron / custom-svg. See [[@concept-pattern-primitives]] |
| `grain` | SVG `feTurbulence` noise overlay |
| `image` | Bitmap / vector image |
| `blobs` | Curated organic shapes — see [[@concept-blob-layer]] |

## Composition

Any mix composed as ordered stack. Each layer supports:
- `opacity` (0–1)
- `blendMode` (`normal` / `multiply` / `screen` / `overlay` / `soft-light`
  / `hard-light` / `color-dodge` / `color-burn`)
- `zIndex` (defaults to array index)

## Gradient primitive

```json
{ "type": "gradient", "kind": "radial", "shape": "circle", "size": "500px", "position": "0% 20%", "stops": [
  { "color": "#0D9488", "opacity": 0.8, "at": 0 },
  { "color": "#0D9488", "opacity": 0, "at": 70 }
]}
```

Linear / radial / conic with custom `stops[]` (each `{ color, opacity, at }`).
Opacity → rgba conversion automatic.

## Grain primitive

```json
{ "type": "grain", "intensity": 0.05, "scale": 0.9, "monochrome": true }
```

Defaults: `intensity: 0.05`, `scale: 0.9`, `monochrome: true` (premium
desaturated grain).

## RN limitations

- **Blob `blur` not rendered** until Plan 4 filter parity.
- **Non-`normal` blendMode** triggers dev-warn on RN — no `mixBlendMode`
  equivalent.

## Custom-svg escape hatch

```json
{ "kind": "custom-svg", "shapes": "<circle.../>", "tileSize": 20 }
```

`sanitizeSVGShapes` uses regex pre-strip + DOMPurify allowlist. Only
circle/rect/path/line/polygon/polyline/ellipse/g/defs/gradients +
geometric attrs survive. Rejects `<script>`, `<foreignObject>`,
`<use href>`, `on*` events, `javascript:` URLs.

## Related concepts

- [[@concept-layer-background]]
- [[@concept-background-stack]]
- [[@concept-pattern-primitives]]
- [[@concept-blob-layer]]
- [[@concept-background-caps]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 171-176, 217`
