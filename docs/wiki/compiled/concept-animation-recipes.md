---
id: concept-animation-recipes
title: 15 animation recipes
kind: concept
sources: [docs/consumer/ai-context.md#interactive-states--animations, docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# 15 animation recipes

Curated set in `ANIMATION_RECIPES`. Mechanical naming (not emotional) for
AI consistency.

## Catalog

| Recipe | Use |
|---|---|
| `fade` | Simple opacity fade |
| `fade-up` | Fade + slide up |
| `fade-down` | Fade + slide down |
| `scale-in` | Scale 0.9 → 1.0 |
| `slide-left` | Slide from right |
| `slide-right` | Slide from left |
| `lift` | Subtle Y-translate (typical hover) |
| `glow` | **WEB-ONLY** — colored boxShadow halo (no RN mapping) |
| `pulse-primary` | Pulse with primary color |
| `breathe-subtle` | Slow scale 1 ↔ 1.025 (perpetual) |
| `shimmer` | Skeleton-style sweep |
| `float` | Slow Y-translate (perpetual) |
| `pop` | Quick scale-up on press |
| `shake` | Error indicator |
| `spin` | 360° rotate (perpetual / loading) |

## Known limitations (per recipe)

- **`glow`** — invisible on light-mode surfaces; web-only (RN
  parity deferred to Plan 4).
- **`pulse-primary`** — currently scale-only (missing color-ring per
  master spec).
- **`shimmer`** — opacity-proxy (spec calls for gradient-position shift).

## Use

```json
"animations": { "mount": { "recipe": "fade-up" } }
"animations": { "mount": { "recipe": "fade-up", "duration": 600, "delay": 200 } }
```

## Defining custom

Inline animation with explicit keyframes:
```json
"animations": { "mount": { "keyframes": [...] } }
```

See [[@concept-keyframe-snapshot]].

## Related concepts

- [[@concept-animations-engine]]
- [[@concept-animation-triggers]]
- [[@concept-keyframe-snapshot]]
- [[@concept-web-only-recipes]]

## Sources (raw)

- `docs/consumer/ai-context.md § Interactive States & Animations`
- `docs/consumer/reference-doc.md § rule 184, 199`
