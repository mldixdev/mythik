---
id: concept-identity-glass-rn
title: Glass surface on React Native — BlurView
kind: concept
sources: [docs/consumer/ai-context-primitives.md#accordion, docs/consumer/reference-doc.md#rule-141]
---

# Glass surface on React Native — BlurView

When `identity.surface === 'glass'`, RN primitives wrap content in
`<BlurView>` from `expo-blur`. **No spec changes needed** — the surface
treatment handles it automatically.

## Affected RN primitives

`accordion`, `input`, `modal`, `select`, `textarea` — all wrap content in
`<BlurView>` when `surface === 'glass'`.

## Mechanism

The RN serializer (`surfaceToRN`) passes `blur: { radius }` through to
surface props. RN primitives detect blur and wrap. `toViewStyle()` strips
`blur` and `focusRing` from surface props before spreading into RN style
objects.

## Glass border uses semi-transparent rgba

Glass surface borders use `hexToRgba(c.surface, 0.2)` for cards/modal/secondary
and `hexToRgba(c.surface, 0.15)` for inputs (rule 142). Glass `inputFocus`
border uses `c.primary + '80'` (50% opacity hex suffix).

## BlurView in tests

`react-native-svg` mock drops the `animatedProps` prop before spreading to
DOM so React doesn't emit "Unknown DOM prop" warnings on every test render.

## Related concepts

- [[@concept-identity-surface]]
- [[@concept-identity-helpers]]
- [[@expression-platform]]

## Sources (raw)

- `docs/consumer/ai-context-primitives.md § accordion (RN glass support note)`
- `docs/consumer/reference-doc.md § rule 141, 142`
