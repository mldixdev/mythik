---
id: primitive-text
title: `text` — text content
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#text]
---

# `text`

Renders text content. `variant` controls the semantic tag and typography
identity (heading h2, body p, caption span, label, mono code).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `content` | string/expression | — | Text content |
| `variant` | string | — | `heading` (h2), `body` (p), `caption` (span), `label` (label), `mono` (code) |
| `className` | string | — | CSS class |

## Examples

```json
{ "type": "text", "props": { "content": "Hello", "variant": "heading" } }
```

Interpolated content:
```json
{ "type": "text", "props": { "content": { "$template": "Hello, ${/user/name}!" } } }
```

Conditional color:
```json
{ "type": "text",
  "props": { "content": "Status" },
  "style": { "color": { "$cond": { "$state": "/ok" }, "$then": "green", "$else": "red" } }
}
```

## Constraints

- Inherits color from the parent surface container (`color: 'inherit'`)
  — surface containers set `color: c.text` so text adapts to dark/colored
  schemes automatically. See [[@concept-identity-color-scheme]].
- Heading variant participates in
  [[@concept-identity-typography-hierarchy]],
  [[@concept-identity-text-decoration]], and
  [[@concept-identity-gradients]].

## Related concepts

- [[@expression-template]]
- [[@expression-format]]
- [[@expression-i18n]]
- [[@concept-identity-typography-hierarchy]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § text`
