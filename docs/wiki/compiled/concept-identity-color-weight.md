---
id: concept-identity-color-weight
title: `identity.colorWeight` — where color appears
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-133]
---

# `identity.colorWeight`

5 modes controlling where color appears in the layout. Resolved values
exposed as `$token: colorWeight.*` in specs.

## Catalog

| Value | Effect |
|---|---|
| `monochrome` | All neutral |
| `branded-nav` | Primary navbar, white text |
| `gradient-hero` | Primary→accent gradient hero section |
| `ambient` | Subtle primary tint on sections via rgba |
| `dark-native` | Dark nav using `modes.dark` |

## Resolved values (`resolveColorWeight()`)

`{ navBg, navText, sectionBg, heroBg, heroGradient }` — always returns
defined values. Non-gradient modes return `'transparent'` / `'none'`
instead of undefined (rule 138) — prevents `$token` resolution errors.

## Use in specs

```json
"sidebar": {
  "type": "box",
  "style": {
    "backgroundColor": { "$token": "colorWeight.navBg" },
    "color": { "$token": "colorWeight.navText" }
  }
}
```

## Related concepts

- [[@concept-identity-overview]]
- [[@concept-identity-accent-application]] — different axis (where ACCENT appears)
- [[@concept-token-categories]] — `colorWeight.*` paths

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Color Weight`
- `docs/consumer/reference-doc.md § rule 133, 138`
