---
id: antipattern-modal-drawer-visible
title: Anti-pattern — `visible` on modal/drawer
kind: pattern
sources: [docs/consumer/ai-context-primitives.md#modal, docs/consumer/reference-doc.md#modal--drawer-auto-visibility]
---

# Anti-pattern — `visible` on modal/drawer

The engine **automatically manages visibility** of modal and drawer
elements via `/ui/modals/{id}` and `/ui/drawers/{id}`. Adding a
`visible` condition is redundant and may conflict with engine logic.

## Wrong

```json
"my-modal": {
  "type": "modal",
  "visible": { "$state": "/ui/showEdit" },           // BAD
  "props": { "title": "Edit" }
}
```

## Right

Don't set `visible`. Use `openModal` / `closeModal` actions to toggle:

```json
"my-modal": {
  "type": "modal",
  "props": { "title": "Edit" },
  "children": ["edit-form"]
}
```

Open from a button:
```json
"on": { "press": { "action": "openModal", "params": { "id": "my-modal" } } }
```

## Behind the scenes

Engine binds `type:"modal"` to `/ui/modals/{elementId}` automatically.
Same for drawers via `/ui/drawers/{id}`.

## Related concepts

- [[@primitive-modal]]
- [[@primitive-drawer]]
- [[@action-modal]]
- [[@action-drawer]]
- [[@path-ui-modals-drawers]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § modal, drawer (Wrong/Right notes)`
- `docs/consumer/reference-doc.md § Modal & Drawer Auto-Visibility`
