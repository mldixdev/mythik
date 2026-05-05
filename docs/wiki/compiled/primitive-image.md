---
id: primitive-image
title: `image` — image
kind: primitive
sources: [docs/consumer/ai-context-primitives.md#image]
---

# `image`

Renders an image. Identity hooks: `corners` defaults from
`identity.images.corners`; `overlay` adds gradient or color tint; `border`
optional 1px frame.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | string/expression | — | Image URL |
| `alt` | string | — | Alt text |
| `aspectRatio` | number | — | Width/height ratio |
| `placeholder` | string | — | Placeholder while loading |

## Examples

```json
{ "type": "image", "props": { "src": "/logo.png", "alt": "Logo", "aspectRatio": 16/9 } }
```

Avatar with state-driven URL:
```json
{ "type": "image", "props": {
  "src": { "$template": "/avatars/${ /auth/user/id }.png" },
  "alt": { "$auth": "name" }
}}
```

## Identity defaults

`identity.images.corners` (`'match-card'` uses card radius, `'circle'`,
`'square'`, `'rounded'`), `identity.images.overlay`, `identity.images.border`
all apply. Spec `style.borderRadius` or `overlay="none"` overrides.

## Related concepts

- [[@concept-identity-images]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § image`
