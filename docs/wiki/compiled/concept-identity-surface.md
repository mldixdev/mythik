---
id: concept-identity-surface
title: `identity.surface` — 6 surface types
kind: concept
sources: [docs/consumer/ai-context.md#identity-system-forge, docs/consumer/reference-doc.md#surface-treatment--6-types-transform-all-containers]
---

# `identity.surface` — 6 surface types

Transforms all containers, inputs, buttons, modals, cards, accordions,
selects, textareas, checkboxes, tables. Set via `tokens.identity.surface`.

## Catalog

| Value | Feel | Effect |
|---|---|---|
| `elevated` | Material, floating (default) | boxShadow + border + solid bg |
| `flat` | Minimal, Notion-like | Color blocks only, no borders/shadows |
| `outlined` | Technical, Linear-like | 1px borders, transparent bg |
| `glass` | Premium, Apple-like | backdrop-filter blur, semi-transparent (needs dark/colored bg) |
| `bold` | Brutalist, confident | 2-3px solid borders, no shadows |
| `neo` | Soft 3D, tangible | Neumorphic inset+outset shadows, no borders |

## Examples

```json
"tokens": { "identity": { "surface": "outlined" } }
```

## Behavior notes

- **Surface styles are explicit** — every property set, no implicit values.
  All 6 types define `border` and `boxShadow` explicitly per component
  category. Properties are `'none'` when not used (rule 113).
- **Surface-aware focus per type** (rule 115): elevated/outlined = 1px
  primary border + ring; flat = no border, ring only; bold = 2px primary
  border + ring; neo = primary-tinted inset + ring; glass = semi-transparent
  primary border + ring.
- **`inputFocus` never includes `backgroundColor`** (rule 140) — would
  overwrite checkbox primary bg when checked+focused.
- **`Select` listbox uses `surface.modal`, NOT `surface.card`** (rule 117)
  — needs opaque bg. See [[@primitive-select]].
- **Flat inputs** differentiate by background color, not borders — use
  `colors.background` instead of `colors.surface` (rule 118).

## React Native — glass support

When `surface === 'glass'`, RN primitives wrap content in `<BlurView>`.
See [[@concept-identity-glass-rn]].

## Related concepts

- [[@primitive-box]] — `surface="card"` / `surface="modal"` props
- [[@concept-identity-overview]]
- [[@concept-identity-helpers]]
- [[@concept-identity-glass-rn]]
- [[@concept-identity-border-elevation-override]]

## Sources (raw)

- `docs/consumer/ai-context.md § Identity System (Forge) → Surface Treatment`
- `docs/consumer/reference-doc.md § rule 112-118, 140`
