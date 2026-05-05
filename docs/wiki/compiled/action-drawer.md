---
id: action-drawer
title: `openDrawer` / `closeDrawer`
kind: action
sources: [docs/consumer/ai-context.md#action-reference, docs/consumer/reference-doc.md#modal--drawer-auto-visibility]
---

# `openDrawer` / `closeDrawer`

Show/hide a drawer element. Engine-managed visibility via `/ui/drawers/{id}`.

## Shape / Signature

```json
{ "action": "openDrawer",  "params": { "id": "<drawer-element-id>" } }
{ "action": "closeDrawer", "params": { "id": "<drawer-element-id>" } }
```

## Examples

Drawer definition:
```json
"detail-drawer": {
  "type": "drawer",
  "props": { "side": "right", "width": 400 },
  "children": ["drawer-content"]
}
```

Open from a table row click:
```json
"onRowClick": { "action": "openDrawer", "params": { "id": "detail-drawer" } }
```

## Constraints / Anti-patterns

- Same as modals — **don't add `visible`.** See
  [[@antipattern-modal-drawer-visible]].

## Related concepts

- [[@primitive-drawer]]
- [[@action-modal]]
- [[@path-ui-modals-drawers]]
- [[@pattern-cross-screen-data-flow]] — drawer + `/ui/selectedRow`

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → Action Reference`
- `docs/consumer/reference-doc.md § Modal & Drawer Auto-Visibility`
