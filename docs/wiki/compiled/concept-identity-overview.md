---
id: concept-identity-overview
title: Identity system - overview
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#identity-system--tokensidentity-controls-visual-identity-beyond-dna]
---

# Identity system - overview

DNA controls continuous/color values. **Identity** controls **categorical**
visual dimensions that make apps look genuinely different. Set via
`tokens.identity` (or runtime via `updateTokens`).

## Validation

Identity values are validated deeply from both AppSpec and screen Spec
`tokens.identity`. Use documented enum values exactly. For example,
`identity.colorScheme` is `"light-surface"`, `"dark-surface"`, or
`"colored-surface"`; `"light"` and `"dark"` are invalid.

## Categorical dimensions

| Dimension | Article |
|---|---|
| `surface` (how containers render) | [[@concept-identity-surface]] |
| `radiusPattern` (corner shape) | [[@concept-identity-radius-pattern]] |
| `typographyHierarchy` (heading scale) | [[@concept-identity-typography-hierarchy]] |
| `labelStyle` (form-label formatting) | [[@concept-identity-label-style]] |
| `textDecoration` (heading effects, multi-select) | [[@concept-identity-text-decoration]] |
| `colorScheme` (light/dark/colored polarity) | [[@concept-identity-color-scheme]] |
| `colorWeight` (where color appears) | [[@concept-identity-color-weight]] |
| `accentApplication` (where accent appears) | [[@concept-identity-accent-application]] |
| `icons` (weight + container defaults) | [[@concept-identity-icons]] |
| `images` (corners + overlay + border) | [[@concept-identity-images]] |
| `gradients` (text + buttons) | [[@concept-identity-gradients]] |
| `headingColor` (heading text color) | [[@concept-identity-heading-color]] |
| `borderWidth` / `elevationStyle` overrides | [[@concept-identity-border-elevation-override]] |
| `animations` (cascade level 1) | [[@concept-identity-animations]] |
| `background` (LayerBackground) | [[@concept-layer-background]] |

## Continuous dimensions

| Dimension | Meaning |
|---|---|
| `depth` (0-1) | Shadow intensity |
| `shadowAngle` (0-360 degrees) | Shadow direction |

## Example

```json
"tokens": {
  "dna": { "primary": "#0D9488", "roundness": 0.7 },
  "identity": {
    "surface": "outlined",
    "radiusPattern": "diagonal",
    "typographyHierarchy": "editorial",
    "labelStyle": "uppercase",
    "textDecoration": ["underline-accent", "shadow"]
  }
}
```

## Related concepts

- [[@concept-dna-seeds]] - continuous side
- [[@concept-token-system]]
- [[@concept-identity-helpers]]

## Sources (raw)

- `docs/consumer/ai-context.md` - Identity System (Forge)
- `docs/consumer/reference-doc.md` - Identity System + rule 111
