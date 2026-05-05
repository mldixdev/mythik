---
id: action-modal
title: `openModal` / `closeModal`
kind: action
sources: [docs/consumer/ai-context.md#action-reference, docs/consumer/reference-doc.md#modal--drawer-auto-visibility]
---

# `openModal` / `closeModal`

Show/hide a modal element. The framework manages modal visibility via
`/ui/modals/{id}` — do **not** add `visible` conditions to `modal` elements.

## Shape / Signature

```json
{ "action": "openModal",  "params": { "id": "<modal-element-id>" } }
{ "action": "closeModal", "params": { "id": "<modal-element-id>" } }
```

## Examples

Modal definition (engine-managed visibility):
```json
"my-dialog": {
  "type": "modal",
  "props": { "title": "Confirm Action" },
  "children": ["dialog-content"]
}
```

Open from a button:
```json
{ "type": "button", "on": { "press": { "action": "openModal", "params": { "id": "my-dialog" } } } }
```

In a transaction `before` phase (always close before optimistic state):
```json
"before": [{ "action": "closeModal", "params": { "id": "edit-modal" } }]
```

## Constraints / Anti-patterns

- **Don't add `visible` to modals.** The engine binds `type:"modal"` to
  `/ui/modals/{elementId}`. See [[@antipattern-modal-drawer-visible]].
- **In transactions, `closeModal` belongs in `before` phase**, not
  `optimistic` — `before` is NOT rolled back, so modal stays closed even
  on error. See [[@concept-transactions]] phase rules.
- **Drawers use `openDrawer`/`closeDrawer`** — distinct paths
  (`/ui/drawers/{id}`).

## Related concepts

- [[@primitive-modal]]
- [[@action-drawer]]
- [[@path-ui-modals-drawers]]
- [[@concept-transactions]] — `before` phase

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → Action Reference`
- `docs/consumer/reference-doc.md § Modal & Drawer Auto-Visibility`
