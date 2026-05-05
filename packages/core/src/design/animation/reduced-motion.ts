// applyReducedMotion — moderate a11y policy per the master design spec.
// Takes an AnimationSpec + trigger, returns a modified spec or null (skip).
// `essential: true` overrides the policy unconditionally — intended for
// spinners and loaders where motion is an affordance not decoration.
//
// Policy (when OS reports prefers-reduced-motion: reduce):
//   mount     → only opacity preserved, transforms stripped
//   unmount   → same as mount
//   hover     → skipped entirely (non-critical feedback)
//   focus     → preserved (a11y-critical)
//   active    → opacity preserved, transforms stripped
//   ambient   → disabled entirely (infinite motion loops are most problematic)
//   stateChange → preserved, duration reduced 3x (min 50ms to retain change signal)
//
// Degenerate-output guard: when stripping transforms leaves keyframes with no
// animated properties (transform-only recipes like slide-left, spin), the
// animation becomes a silent no-op. We return null in that case so the Layer 2
// runner skips scheduling a frame, matching the hover/ambient skip semantics.
//
// The function does NOT mutate its input. It returns a new spec (or null).

import type { AnimationSpec, AnimationTrigger, KeyframeSnapshot } from './types.js';

const MIN_STATE_CHANGE_DURATION_MS = 50;

function stripTransform(keyframes: KeyframeSnapshot[]): KeyframeSnapshot[] {
  return keyframes.map(({ transform: _t, ...rest }) => rest);
}

function hasAnimatedProperty(keyframes: KeyframeSnapshot[]): boolean {
  return keyframes.some(({ at: _at, ...rest }) => Object.keys(rest).length > 0);
}

function stripAndGuard(spec: AnimationSpec): AnimationSpec | null {
  const stripped = stripTransform(spec.keyframes);
  if (!hasAnimatedProperty(stripped)) return null;
  return { ...spec, keyframes: stripped };
}

export function applyReducedMotion(
  spec: AnimationSpec,
  trigger: AnimationTrigger,
): AnimationSpec | null {
  if (spec.essential) return spec;

  switch (trigger) {
    case 'mount':
    case 'unmount':
    case 'active':
      return stripAndGuard(spec);
    case 'hover':
    case 'ambient':
      return null;
    case 'focus':
      return spec;
    case 'stateChange':
      return {
        ...spec,
        duration: Math.max(MIN_STATE_CHANGE_DURATION_MS, Math.round(spec.duration / 3)),
      };
  }
}
