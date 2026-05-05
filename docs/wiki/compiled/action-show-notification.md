---
id: action-show-notification
title: `showNotification` / `dismissNotification`
kind: action
sources: [docs/consumer/ai-context.md#action-reference, docs/consumer/reference-doc.md#toast-notifications]
---

# `showNotification` / `dismissNotification`

Toasts render automatically — no `toast-container` element required unless
custom positioning. Types: `success`, `error`, `warning`, `info`.

## Shape / Signature

```json
{ "action": "showNotification", "params": {
  "message": "<string>",
  "type": "success" | "error" | "warning" | "info",
  "title"?: "<string>",
  "duration"?: <number-ms> | null
}}

{ "action": "dismissNotification", "params": { "id": "<notification-id>" } }
```

## Examples

Basic success toast:
```json
{ "action": "showNotification", "params": { "message": "Task created successfully", "type": "success" } }
```

Error with title:
```json
{ "action": "showNotification", "params": {
  "title": "Error",
  "message": "Could not save. Server returned 500.",
  "type": "error"
}}
```

Persistent (no auto-dismiss):
```json
{ "action": "showNotification", "params": {
  "message": "Unsaved changes",
  "type": "warning",
  "duration": null
}}
```

## Constraints / Anti-patterns

- `duration: null` = persistent (no auto-dismiss).
- For custom position/duration globally, add a `toast-container` element
  — see [[@primitive-toast-container]].

## Related concepts

- [[@primitive-toast-container]] — global config + override
- [[@concept-transactions]] — typical use in `onError` phase

## Sources (raw)

- `docs/consumer/ai-context.md § Actions → Action Reference`
- `docs/consumer/reference-doc.md § Toast Notifications`
