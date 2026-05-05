---
id: concept-identity-label-style
title: `identity.labelStyle` — form label formatting
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-121]
---

# `identity.labelStyle`

3 modes for form labels — applied to labels inside `input`, `textarea`,
`select`, `checkbox` (not just `<Text variant="label">`).

| Value | Effect |
|---|---|
| `normal` | (default) |
| `uppercase` | textTransform + letterSpacing 0.08em |
| `accent-colored` | Label text in accent color |

## Example

```json
"tokens": { "identity": { "labelStyle": "uppercase" } }
```

## Related concepts

- [[@primitive-input]]
- [[@primitive-textarea]]
- [[@primitive-select]]
- [[@primitive-checkbox]]
- [[@concept-identity-overview]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Label Style`
- `docs/consumer/reference-doc.md § rule 121`
