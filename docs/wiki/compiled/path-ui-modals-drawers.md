---
id: path-ui-modals-drawers
title: `/ui/modals/{id}` and `/ui/drawers/{id}`
kind: concept
sources: [docs/consumer/ai-context-runtime-semantics.md#23-uimodalsid-and-uidrawersid]
---

# `/ui/modals/{id}` and `/ui/drawers/{id}`

Framework-managed visibility paths for modals and drawers.

## Behavior

- `openModal` writes `true` to `/ui/modals/<id>`.
- `closeModal` writes `false`.
- Same pattern for drawers at `/ui/drawers/<id>`.
- The renderer reads these paths to determine visibility.

## Consumer contract

**Do NOT set `visible` on `modal` or `drawer` elements** — engine manages
visibility automatically. See [[@antipattern-modal-drawer-visible]].

## Examples

Open a modal:
```json
{ "action": "openModal", "params": { "id": "edit-modal" } }
```

Read modal state (typically not needed — the engine reads it):
```json
{ "$state": "/ui/modals/edit-modal" }
```

## Related concepts

- [[@primitive-modal]]
- [[@primitive-drawer]]
- [[@action-modal]]
- [[@action-drawer]]
- [[@antipattern-modal-drawer-visible]]

## Sources (raw)

- `docs/consumer/ai-context-runtime-semantics.md § 2.3`
