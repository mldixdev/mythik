---
id: primitive-modal
title: `modal` — overlay dialog
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#modal, docs/consumer/reference-doc.md#modal--drawer-auto-visibility]
---

# `modal`

Overlay dialog. **Engine-managed visibility** via `/ui/modals/{elementId}`.
Use `openModal` / `closeModal` actions.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `visible` | — | — | Managed by engine — do NOT set |
| `title` | string/expression | — | Modal header (rendered as h2) |

## Examples

```json
"my-modal": {
  "type": "modal",
  "props": { "title": "Confirm" },
  "children": ["content"]
}
```

Open from a button:
```json
"on": { "press": { "action": "openModal", "params": { "id": "my-modal" } } }
```

## Constraints / Anti-patterns

- **Don't set `visible`.** Engine binds visibility to `/ui/modals/{id}`.
  See [[@antipattern-modal-drawer-visible]].
- **In transactions, `closeModal` belongs in `before` phase** — not
  rolled back on error.

## Related concepts

- [[@action-modal]]
- [[@path-ui-modals-drawers]]
- [[@concept-identity-surface]] — modals always use opaque `surface.modal`

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § modal`
- `docs/consumer/reference-doc.md § Modal & Drawer Auto-Visibility`
