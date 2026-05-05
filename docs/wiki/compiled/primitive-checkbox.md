---
id: primitive-checkbox
title: `checkbox`
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#checkbox, docs/consumer/reference-doc.md#rule-123]
---

# `checkbox`

Custom-rendered checkbox (div+SVG, not native browser). Surface-aware:
adapts to identity surface treatment (bold=thick border, neo=inset shadow,
flat=no border). Unchecked uses `t.surface.input`; checked fills with
primary while preserving surface border.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | boolean/expression | — | Bind via `$bindState`. **NOT `value`** |
| `label` | string/expression | — | Label text |
| `disabled` | boolean/expression | `false` | Disable |

## Events

`on.change`.

## Examples

```json
{ "type": "checkbox", "props": {
  "checked": { "$bindState": "/form/agreed" },
  "label": "I agree"
}}
```

In a list (per-row):
```json
"select-checkbox": {
  "type": "checkbox",
  "props": { "checked": { "$selection": "selected" } },
  "on": { "change": { "action": "toggleSelection", "params": { "statePath": "/selectedIds", "value": { "$item": "id" } } } }
}
```

## Constraints / Anti-patterns

- **Use `checked`, NOT `value`.** See
  [[@antipattern-checkbox-toggle-value]].
- Focus uses `t.surface.inputFocus` which never includes
  `backgroundColor` (prevents overwriting checked primary bg).

## Related concepts

- [[@expression-bindstate]]
- [[@expression-selection]]
- [[@primitive-toggle]]
- [[@concept-identity-surface]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § checkbox`
- `docs/consumer/reference-doc.md § rule 123`
