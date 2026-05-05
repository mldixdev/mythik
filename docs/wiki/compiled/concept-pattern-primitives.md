---
id: concept-pattern-primitives
title: Pattern primitives (background `pattern` kind)
kind: concept
sources: [docs/consumer/reference-doc.md#rules-174-179]
---

# Pattern primitives

6 curated pattern kinds + `custom-svg` escape hatch. Each emits an
`<pattern>` SVG fragment for `BackgroundLayer`.

## Curated kinds

`grid`, `dots`, `diagonal`, `iso`, `crosshatch`, `chevron`.

## Common params

| Param | Used by | Description |
|---|---|---|
| `spacing` | all | Distance between repeats |
| `thickness` | all | Line/dot thickness |
| `color` | all | Pattern color |
| `angle` | diagonal, iso, crosshatch | Rotation degrees |
| `dotRadius` | dots only | Dot radius |

## Custom-svg escape hatch

```json
{ "kind": "custom-svg", "shapes": "<circle cx=\"5\" cy=\"5\" r=\"2\"/>", "tileSize": 10 }
```

`sanitizeSVGShapes` uses regex pre-strip + DOMPurify allowlist:
- **Allowed**: circle, rect, path, line, polygon, polyline, ellipse,
  g, defs, gradients + geometric attrs.
- **Rejected**: `<script>`, `<foreignObject>`, `<use href>`, `on*` events,
  `javascript:` URLs.

Cross-platform safe (isomorphic-dompurify).

## Example

```json
{ "type": "pattern", "kind": "grid", "spacing": 24, "thickness": 1, "color": "rgba(0,0,0,0.05)" }
```

## Related concepts

- [[@concept-background-layer-kinds]]
- [[@concept-layer-background]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 174, 179`
