// 15 curated animation recipes — initial defaults for plan 2.
// These values are subject to a dedicated playground A/B tuning pass
// (Task 21) before they are considered frozen for shipping.
// Each recipe is an InlineAnimation — a concrete keyframe sequence with
// duration + easing + (optional) iterations/fillMode. Consumed by the
// animation engine via resolveAnimation({ recipe: '<name>' }, ANIMATION_RECIPES).
//
// Post-Task-21 tuning status:
//   - `glow`: migrated to the new boxShadow keyframe field (Task 21) —
//     animates from `none` to a colored shadow halo (indigo-toned, indigo-600
//     at 45% alpha + 20px blur + 4px spread). Semantically correct "glow" on
//     web; on RN the box-shadow is a no-op (documented policy — same as
//     `filter`), so the hover trigger is a silent no-op on native. A future
//     framework feature (plan 3+) can add RN shadow* mapping for parity.
//   - `breathe-subtle`: retuned to scale 1.025 @ 2800ms (Task 21) so the
//     perceivability floor is crossed on typical target sizes.
//   - `pulse-primary`: the master-spec color-ring aspect can now be added
//     using the same boxShadow field (post-plan-2 enhancement candidate).
//     Current implementation is scale-only — accepted as "funciona
//     adecuadamente" for initial ship.
//   - `shimmer`: opacity-proxy (1 \u2192 0.85 \u2192 1). Master spec pointed at a
//     backgroundColor gradient-position shift for a true shimmer effect;
//     gradient-position requires broader framework work. Accepted for ship.

import type { InlineAnimation } from '../animation/types.js';

/**
 * Recipes that use keyframe fields with no RN mapping (boxShadow, filter).
 * On React Native these recipes are silent no-ops until per-platform parsing
 * lands (post-plan-2). Exported so the validator can warn about their use.
 * DO NOT add a recipe here unless it genuinely has no cross-platform path —
 * the list is deliberately small and reviewed.
 */
export const WEB_ONLY_RECIPES: ReadonlySet<string> = new Set(['glow']);

export const ANIMATION_RECIPES: Record<string, InlineAnimation> = {
  fade: {
    keyframes: [
      { at: '0%', opacity: 0 },
      { at: '100%', opacity: 1 },
    ],
    duration: 200,
    easing: 'ease-out',
  },

  'fade-up': {
    keyframes: [
      { at: '0%', opacity: 0, transform: { translateY: 20 } },
      { at: '100%', opacity: 1, transform: { translateY: 0 } },
    ],
    duration: 500,
    easing: 'ease-out',
  },

  'fade-down': {
    keyframes: [
      { at: '0%', opacity: 1, transform: { translateY: 0 } },
      { at: '100%', opacity: 0, transform: { translateY: 20 } },
    ],
    duration: 300,
    easing: 'ease-in',
  },

  'scale-in': {
    keyframes: [
      { at: '0%', opacity: 0, transform: { scale: 0.95 } },
      { at: '100%', opacity: 1, transform: { scale: 1 } },
    ],
    duration: 300,
    easing: 'ease-out',
  },

  'slide-left': {
    keyframes: [
      { at: '0%', transform: { translateX: 40 } },
      { at: '100%', transform: { translateX: 0 } },
    ],
    duration: 400,
    easing: 'ease-out',
  },

  'slide-right': {
    keyframes: [
      { at: '0%', transform: { translateX: -40 } },
      { at: '100%', transform: { translateX: 0 } },
    ],
    duration: 400,
    easing: 'ease-out',
  },

  lift: {
    keyframes: [
      { at: '0%', transform: { translateY: 0, scale: 1 } },
      { at: '100%', transform: { translateY: -2, scale: 1.01 } },
    ],
    duration: 160,
    easing: 'ease-out',
    fillMode: 'forwards',
  },

  glow: {
    // Colored shadow halo: canonical glow primitive (matches Linear/Stripe).
    // Uses the new boxShadow keyframe field (Task 21). The previous
    // backgroundColor tint was semantically wrong — a tint darkens, a glow
    // brightens. Indigo-600 at 45% alpha with 20px blur + 4px spread reads
    // as a warm highlight ring on both light and dark surfaces.
    // Web-only effect: RN treats boxShadow as no-op (same policy as `filter`).
    keyframes: [
      { at: '0%', boxShadow: 'none' },
      { at: '100%', boxShadow: '0 0 20px 4px rgba(99,102,241,0.45)' },
    ],
    duration: 200,
    easing: 'ease-out',
    fillMode: 'forwards',
  },

  'pulse-primary': {
    keyframes: [
      { at: '0%', transform: { scale: 1 } },
      { at: '50%', transform: { scale: 1.05 } },
      { at: '100%', transform: { scale: 1 } },
    ],
    duration: 1400,
    easing: 'ease-in-out',
    iterations: 'infinite',
  },

  'breathe-subtle': {
    // Scale lifted from 1.015 to 1.025 and duration trimmed 3000 → 2800ms
    // (Task 21 tuning). 1.5% was below perception threshold on small targets;
    // 2.5% reads as "alive" without being nervous. 2800ms keeps a calm,
    // respiratory rhythm.
    keyframes: [
      { at: '0%', transform: { scale: 1 } },
      { at: '50%', transform: { scale: 1.025 } },
      { at: '100%', transform: { scale: 1 } },
    ],
    duration: 2800,
    easing: 'ease-in-out',
    iterations: 'infinite',
  },

  shimmer: {
    keyframes: [
      { at: '0%', opacity: 1 },
      { at: '50%', opacity: 0.85 },
      { at: '100%', opacity: 1 },
    ],
    duration: 1800,
    easing: 'ease-in-out',
    iterations: 'infinite',
  },

  float: {
    keyframes: [
      { at: '0%', transform: { translateY: 0 } },
      { at: '50%', transform: { translateY: -6 } },
      { at: '100%', transform: { translateY: 0 } },
    ],
    duration: 3200,
    easing: 'ease-in-out',
    iterations: 'infinite',
  },

  pop: {
    keyframes: [
      { at: '0%', transform: { scale: 1 } },
      { at: '40%', transform: { scale: 1.1 } },
      { at: '100%', transform: { scale: 1 } },
    ],
    duration: 250,
    easing: 'ease-out',
  },

  shake: {
    keyframes: [
      { at: '0%', transform: { translateX: 0 } },
      { at: '20%', transform: { translateX: -8 } },
      { at: '40%', transform: { translateX: 8 } },
      { at: '60%', transform: { translateX: -6 } },
      { at: '80%', transform: { translateX: 6 } },
      { at: '100%', transform: { translateX: 0 } },
    ],
    duration: 400,
    easing: 'ease-in-out',
  },

  spin: {
    keyframes: [
      { at: '0%', transform: { rotate: 0 } },
      { at: '100%', transform: { rotate: 360 } },
    ],
    duration: 1000,
    easing: 'linear',
    iterations: 'infinite',
  },
};
