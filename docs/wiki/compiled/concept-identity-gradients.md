---
id: concept-identity-gradients
title: `identity.gradients` — gradient text + buttons
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rules-145-146-150-151]
---

# `identity.gradients`

Apply primary→accent gradient to headings or primary buttons.

## Fields

| Field | Accepts | Effect |
|---|---|---|
| `text` | `boolean` \| `'vibrant'` \| `'soft'` \| `'muted'` | Apply `background-clip: text` on headings. Spec `style.color` overrides |
| `buttons` | `boolean` \| `'vibrant'` \| `'soft'` \| `'muted'` | Apply `linear-gradient(135deg, primary, accent)` on primary buttons. Spec `style.background` overrides |

`true` maps to `vibrant`. Both web-only (RN deferred — requires
`expo-linear-gradient`).

## Modes

| Mode | Effect |
|---|---|
| `vibrant` | OKLCH primary→accent (rich, saturated) |
| `soft` | OKLCH primaryLight→accentLight (subtle) |
| `muted` | sRGB primary→accent (desaturated middle, luxury/editorial) |

## OKLCH interpolation

All gradient text + buttons use `linear-gradient(in oklch, ...)` for
vibrant transitions. sRGB interpolation crosses through desaturated
midpoints (purple→gold = muddy brown); OKLCH maintains saturation through
the hue arc. Graceful degradation on older browsers.

## Example

```json
"tokens": { "identity": {
  "gradients": { "text": "vibrant", "buttons": "soft" }
}}
```

## Related concepts

- [[@concept-identity-overview]]
- [[@concept-identity-typography-hierarchy]]
- [[@concept-identity-heading-color]] — gradient takes precedence
- [[@primitive-text]]
- [[@primitive-button]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge)`
- `docs/consumer/reference-doc.md § rules 145-146, 150-151`
