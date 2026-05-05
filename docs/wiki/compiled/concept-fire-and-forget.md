---
id: concept-fire-and-forget
title: `fireAndForget` — background action dispatch
kind: concept
sources: [docs/consumer/ai-context.md#actions, docs/consumer/reference-doc.md#fireandforget-mode]
---

# `fireAndForget` — background action dispatch

Add `"fireAndForget": true` to dispatch an action without waiting for it to
complete. The next action in the chain starts immediately. Use for
background re-fetches that shouldn't block UI transitions.

## Shape / Signature

```json
{ "action": "fetch", "fireAndForget": true, "params": { ... } }
```

## Examples

Close modal instantly, refresh data in background:
```json
"press": [
  { "action": "closeModal", "params": { "id": "edit-modal" } },
  { "action": "fetch", "fireAndForget": true, "params": { "url": "/api/items", "target": "/items" } }
]
```

## Use case

The user sees the modal close immediately. Behind the scenes, the GET
re-fetches and updates `/items`. Without `fireAndForget`, the chain would
wait for the GET to complete before returning control to the renderer.

## Related concepts

- [[@concept-action-chains]] — default sequential semantics
- [[@action-fetch]]
- [[@concept-transactions]] — alternative for optimistic UX

## Sources (raw)

- `docs/consumer/ai-context.md § Actions`
- `docs/consumer/reference-doc.md § fireAndForget Mode`
