---
id: concept-spec-structure
title: Spec Structure (Flat Tree)
kind: concept
sources: [docs/consumer/ai-context.md#spec-structure, docs/consumer/reference-doc.md#spec-structure-flat-tree]
---

# Spec Structure (Flat Tree)

Every screen is a JSON Spec with three top-level fields: a `root` ID (string),
a flat `elements` map (ID → element definition), and optional `initialActions`
that fire on spec mount. Children are referenced by ID — never inlined. This
flat shape keeps every element addressable by JSON Pointer for patching and
makes the renderer's expansion logic mechanical.

## Shape / Signature

```json
{
  "root": "main-layout",
  "initialActions": [
    { "action": "fetch", "params": { "url": "/api/data", "target": "/items" } }
  ],
  "elements": {
    "main-layout": {
      "type": "stack",
      "props": { "direction": "vertical" },
      "children": ["header", "content"]
    },
    "header": {
      "type": "text",
      "props": { "content": "Hello", "variant": "heading" }
    },
    "content": {
      "type": "box",
      "children": ["field1"]
    }
  }
}
```

## Top-Level Properties

| Property | Type | Purpose |
|---|---|---|
| `root` | string | ID of the root element |
| `elements` | object | Flat map of element ID → definition |
| `initialActions` | ActionBinding[] | Actions on spec mount (e.g., fetch data) |
| `derive` | object | Auto-computed reactive state |
| `forms` | object | Declarative form validation |
| `dataSources` | object | Reactive data fetching |
| `templates` | object | Reusable element definitions |

## Examples

Minimal spec:
```json
{ "root": "page", "elements": { "page": { "type": "text", "props": { "content": "Hello" } } } }
```

Spec with mount-time data load:
```json
{
  "root": "list",
  "initialActions": [{ "action": "fetch", "params": { "url": "/api/items", "target": "/items" } }],
  "elements": {
    "list": { "type": "stack", "repeat": { "statePath": "/items", "key": "id" }, "children": ["row"] },
    "row": { "type": "text", "props": { "content": { "$item": "name" } } }
  }
}
```

## Constraints / Anti-patterns

- **Flat tree only** — children are string IDs, never inline objects. Inline
  children break patching and break expression scope tracking.
- **Field IDs must be unique within the spec.** Use descriptive names
  (`patient-name`, `submit-btn`). Duplicate keys silently overwrite during
  JSON parse.
- **Use arrays for ordered collections** — `children` is an array, never an
  object. Object-keyed children would lose order in JSONB storage.

## Related concepts

- [[@concept-element-properties]] — full element property catalogue
- [[@concept-spec-types]] — Spec vs ApiSpec vs AppSpec discrimination
- [[@concept-initial-actions]] — `initialActions` semantics
- [[@concept-element-key]] — dynamic remount via `key`
- [[@concept-templates]] — reusable element definitions

## Sources (raw)

- `docs/consumer/ai-context.md` — "Spec Structure" section
- `docs/consumer/reference-doc.md` — "Spec Structure (Flat Tree)"
