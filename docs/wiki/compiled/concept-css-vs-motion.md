---
id: concept-css-vs-motion
title: CSS vs Motion — auto-detection
kind: concept
sources: [docs/consumer/ai-context.md#interactive-states--animations, docs/consumer/reference-doc.md#interactive-states]
---

# CSS vs Motion — auto-detection

The framework chooses CSS pseudo-classes or Motion wrapper based on
prop names automatically. No manual choice needed.

## Rule

If `hover` / `active` / `focus` contains any of these **6 transform
properties** → Motion wrapper:

`scale`, `scaleX`, `scaleY`, `rotate`, `x`, `y`

Everything else (color, backgroundColor, boxShadow, opacity, etc.) → CSS
`:hover` / `:active` / `:focus-visible` pseudo-classes (no wrapper, no
extra DOM node).

## CSS hover only works on

`box`, `text`, `stack`, `grid`, `scroll`, `button`, `touchable`, `table`.
Other types silently ignore CSS hover. `mythik validate` catches this
(rule 14).

## Why this matters

CSS pseudo-classes are zero-overhead — no React state, no DOM wrapping.
Motion-driven transforms need a wrapper component to interpolate.
Mixing both works fine — properties that match Motion go through the
wrapper; the rest are CSS.

## Related concepts

- [[@concept-interactive-states]]
- [[@concept-animations-engine]] — animation engine alternative
- [[@antipattern-overflow-hidden-with-shadow]]

## Sources (raw)

- `docs/consumer/ai-context.md § Interactive States & Animations`
- `docs/consumer/reference-doc.md § Interactive States → CSS vs Motion`
