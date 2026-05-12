---
id: primitive-select
title: `select` — dropdown
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#select, docs/consumer/reference-doc.md#rule-117, docs/consumer/reference-doc.md#rule-225]
---

# `select`

Dropdown picker. Options accept strings, `[{ label, value }]` objects, or
catalog-shaped objects when `labelKey` and `valueKey` are provided.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | expression | — | Bind via `$bindState` |
| `options` | array | — | Strings or `[{ label, value }]` objects |
| `placeholder` | string | — | Placeholder text |
| `label` | string/expression | — | Field label |
| `disabled` | boolean/expression | `false` | Disable |
| `required` | boolean | `false` | Visual indicator |

## Events

`on.change`.

## Examples

Plain string options:
```json
{ "type": "select", "props": {
  "options": ["Low", "Medium", "High"],
  "value": { "$bindState": "/form/priority" }
}}
```

Label/value pairs:
```json
{ "type": "select", "props": {
  "options": [
    { "label": "Low", "value": "low" },
    { "label": "Medium", "value": "medium" },
    { "label": "High", "value": "high" }
  ],
  "value": { "$bindState": "/form/priority" }
}}
```

State-driven options:
```json
{ "type": "select", "props": {
  "options": { "$state": "/presets/available" },
  "value": { "$bindState": "/ui/currentPreset" }
}}
```

Catalog-shaped options:
```json
{ "type": "select", "props": {
  "options": { "$state": "/cat/services/data" },
  "labelKey": "name",
  "valueKey": "id",
  "value": { "$bindState": "/form/serviceId" }
}}
```

## Notes

- **Listbox portals to `document.body`** (rule 225) — the dropdown panel
  uses `React.createPortal` so nested stacking contexts can't occlude it.
  Position uses `position: fixed` synced via `getBoundingClientRect()`.
- **Dropdown uses `surface.modal`, NOT `surface.card`** (rule 117) — needs
  opaque background for readability across all surface modes (in
  `outlined`, card has transparent bg).

Malformed option data renders as disabled diagnostics instead of blank
clickable rows or crashes. `labelKey` and `valueKey` are simple field names on each
option object, not nested paths.

## Related concepts

- [[@expression-bindstate]]
- [[@concept-preset-dropdown-pattern]]
- [[@concept-identity-surface]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § select`
- `docs/consumer/reference-doc.md § rules 117, 225`
