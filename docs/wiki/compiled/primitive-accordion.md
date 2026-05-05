---
id: primitive-accordion
title: `accordion` — collapsible section
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#accordion, docs/consumer/reference-doc.md#rule-156]
---

# `accordion`

Collapsible section with header + content. Optional `badge` indicator.
Children render inside.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string/expression | — | Header |
| `defaultOpen` | boolean | `false` | Open on mount |
| `badge` | string/number/boolean | — | Indicator next to title. `true` = solid dot, number/string = pill with text. Falsy hides |

## Examples

Reactive badge:
```json
{ "type": "accordion", "props": {
  "title": "Modified fields",
  "badge": { "$state": "/modified/section1" }
}, "children": ["field1", "field2"] }
```

## Notes

- **React Native glass support:** when `identity.surface === 'glass'`, RN
  primitives (accordion, input, modal, select, textarea) wrap content in
  `<BlurView>` from `expo-blur`. No spec changes needed.

## Related concepts

- [[@expression-state]]
- [[@concept-identity-glass-rn]]
- [[@concept-identity-surface]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § accordion`
- `docs/consumer/reference-doc.md § rule 156`
