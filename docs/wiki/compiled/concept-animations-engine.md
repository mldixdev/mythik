---
id: concept-animations-engine
title: `animations` engine (preferred)
kind: concept
sources: [docs/consumer/ai-context.md#interactive-states--animations, docs/consumer/reference-doc.md#animation-system--infrastructure-plan-2-2026-04-18]
---

# `animations` engine

The animation engine — cross-platform (web + RN), reduced-motion aware,
integrates with the 5-level cascade. Use `animations` instead of legacy
`motion` for new specs.

## Shape / Signature

```json
"animations": {
  "mount":   { "recipe": "fade-up" },
  "hover":   { "recipe": "lift" },
  "active":  { "recipe": "pop" },
  "ambient": { "recipe": "breathe-subtle" },
  "stateChange": { "watch": "/cart/count", "on": "increase", "recipe": "pop", "duration": 300 }
}
```

## Per-trigger forms

```json
"animations": {
  "mount": { "recipe": "fade-up" }                                   // single recipe
  "mount": { "recipe": "fade-up", "duration": 400, "delay": 100 }     // recipe with overrides
  "mount": [{ "recipe": "fade" }, { "recipe": "scale-in" }]           // array — parallel animations
  "mount": null                                                       // disable inherited animation
  "mount": { "keyframes": [...] }                                     // inline animation, no recipe
}
```

## 7 triggers

`mount`, `unmount`, `hover`, `focus`, `active`, `ambient`, `stateChange`.
See [[@concept-animation-triggers]].

## 15 recipes

`fade`, `fade-up`, `fade-down`, `scale-in`, `slide-left`, `slide-right`,
`lift`, `glow`, `pulse-primary`, `breathe-subtle`, `shimmer`, `float`,
`pop`, `shake`, `spin`. See [[@concept-animation-recipes]].

## Caps

- Per-trigger: soft 3 (warn), hard 6 (error).
- Per-element: soft 5 triggers (warn), hard 7 (error — all triggers filled).

See [[@concept-animation-caps]].

## Cascade

`identity → variant → elementDef → template → element` — see
[[@concept-animation-cascade]] for full merge semantics including
null-disable.

## Related concepts

- [[@concept-animation-triggers]]
- [[@concept-animation-recipes]]
- [[@concept-animation-cascade]]
- [[@concept-animation-null-semantics]]
- [[@concept-state-change-animation]]
- [[@concept-reduced-motion]]
- [[@concept-animation-caps]]
- [[@concept-keyframe-snapshot]]
- [[@concept-web-only-recipes]]
- [[@concept-motion-field]] — legacy alternative

## Sources (raw)

- `docs/consumer/ai-context.md § Interactive States & Animations → Animation engine`
- `docs/consumer/reference-doc.md § Animation System` (rules 180-200)
