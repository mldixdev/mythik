---
id: concept-animation-build-css
title: `buildCSSKeyframes` — web output
kind: concept
sources: [docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# `buildCSSKeyframes` — web output

Web animation builder. Returns `{ name, keyframesText, animationCSS }`.

## Output

- `name` — `svka-${djb2(fingerprint)}`. Deterministic hash of content for
  Constructable StyleSheets dedup.
- `keyframesText` — derived `at` from normalized fraction (not raw input)
  for whitespace-clean output.
- `animationCSS` — CSS shorthand: `name duration easing delay iter
  direction fillMode`.

## Mounting (web)

`packages/react/src/animation/stylesheet-singleton.ts` — Constructable
StyleSheets singleton + `<style>.insertRule` fallback. `registerKeyframes(name,
text)` is idempotent dedup by name. Feature-detected with iterability
probe (jsdom defines `adoptedStyleSheets` non-iterably — fallback path
activates). SSR-safe (`canUseDOM()` guards). **Zero `dangerouslySetInnerHTML`
in either path** — CSSOM only.

## Useful for

- Custom animation libraries reading the framework's resolved AnimationSpec.
- Debugging unexpected animation rendering.

## Related concepts

- [[@concept-animation-build-rn]] — RN parallel
- [[@concept-keyframe-snapshot]]
- [[@concept-shape-animations]]

## Sources (raw)

- `docs/consumer/reference-doc.md § rules 185, 190`
