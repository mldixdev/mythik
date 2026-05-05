---
id: primitive-drawer
title: `drawer` — side panel overlay
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#drawer]
---

# `drawer`

Side-panel overlay. Engine-managed via `/ui/drawers/{elementId}`. Use
`openDrawer` / `closeDrawer`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | — | — | Managed by engine — do NOT set |
| `side` | string | `right` | `left` or `right` |
| `width` | number | `300` | Width in pixels |

## Examples

```json
"detail-drawer": {
  "type": "drawer",
  "props": { "side": "right", "width": 400 },
  "children": ["drawer-content"]
}
```

## Constraints / Anti-patterns

- **Don't set `visible`** (rule 10) — see
  [[@antipattern-modal-drawer-visible]].

## Related concepts

- [[@action-drawer]]
- [[@path-ui-modals-drawers]]
- [[@pattern-cross-screen-data-flow]] — typical drawer-with-row-detail use

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § drawer`
