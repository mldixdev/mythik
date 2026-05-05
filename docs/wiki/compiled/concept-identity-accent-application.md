---
id: concept-identity-accent-application
title: `identity.accentApplication` — where accent appears
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#rule-134]
---

# `identity.accentApplication`

Controls where the accent color appears.

## Fields

| Field | Type | Effect |
|---|---|---|
| `buttons` | boolean | buttonPrimary uses accent |
| `navItems` | boolean | Highlights active nav |
| `cardLine` | array | Accent border on cards. Multi-select positions: `["top", "left"]` for L-shape |
| `links` | boolean | Link color |
| `backgrounds` | boolean | Section bg uses accentLight |
| `iconContainers` | boolean | Icon container bg |

## Example

L-shape accent border on cards:
```json
"tokens": {
  "identity": {
    "accentApplication": { "cardLine": ["top", "left"], "buttons": false }
  }
}
```

## Mechanism

Applied inside `resolveSurfaceStyles` via `SurfaceOptions.accent` /
`cardLine` / `accentButtons`.

## Related concepts

- [[@concept-identity-overview]]
- [[@concept-identity-color-weight]] — different axis (where COLOR appears)
- [[@concept-identity-helpers]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Accent Application`
- `docs/consumer/reference-doc.md § rule 134`
