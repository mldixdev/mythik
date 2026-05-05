---
id: primitive-box
title: `box` — generic container
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#box, docs/consumer/reference-doc.md]
---

# `box`

Generic container element. Common-prop carrier for `style`, `visible`, etc.
The `surface` prop hooks into the identity system to consume per-type surface
treatment (border, shadow, bg, borderRadius).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | string | — | CSS class |
| `surface` | string | — | `"card"` (stat cards, form cards), `"modal"` (overlays); omit for plain layout div |

## Examples

Card with identity-driven surface:
```json
"stat-card": {
  "type": "box",
  "props": { "surface": "card" },
  "style": { "padding": 24 },
  "children": ["value", "label"]
}
```

Plain layout box (no surface treatment):
```json
"row": { "type": "box", "style": { "display": "flex", "gap": 12 }, "children": ["a", "b"] }
```

## Constraints / Anti-patterns

- **Use `surface="card"` on card-like containers.** Without it, the box
  ignores identity surface treatment and looks inconsistent (rule 40).
- **Use `surface="modal"` for overlay panels** — see also
  [[@antipattern-overflow-hidden-with-shadow]] when adding `box-shadow`
  hover with overflow.
- The `backgroundBlobs` prop was REMOVED in the current LayerBackground contract. App-level
  background lives at `tokens.identity.background` — see
  [[@antipattern-background-blobs-prop]].

## Related concepts

- [[@concept-identity-surface]]
- [[@concept-element-properties]]
- [[@pattern-identity-aware-spec]]
- [[@concept-layer-background]] — app-level backgrounds

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § box`
