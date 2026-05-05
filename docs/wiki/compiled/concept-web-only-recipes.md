---
id: concept-web-only-recipes
title: `WEB_ONLY_RECIPES`
kind: concept
sources: [docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# `WEB_ONLY_RECIPES`

`WEB_ONLY_RECIPES: ReadonlySet<string>` — recipes with no RN mapping
until per-platform shadow / filter parsing lands. **Currently `{ 'glow' }`.**

## Behavior

- Web: renders correctly.
- RN: silent no-op (the trigger fires but no visual change).
- `validateAnimationCaps` walks each trigger's AnimationRefs and emits a
  warning when a web-only recipe is referenced, calling out the silent RN
  no-op.

## Why glow is web-only

`glow` migrated from backgroundColor tint to `boxShadow` halo (rule 197).
RN doesn't have a 1:1 mapping for animated `boxShadow` strings. Deferred
to a dedicated Plan 4 "RN Motion Parity" milestone — iOS shadow props +
Android elevation are semantically incompatible and merit separate
investigation.

## Related concepts

- [[@concept-animation-recipes]]
- [[@concept-animation-caps]]
- [[@concept-animation-build-rn]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rule 198`
