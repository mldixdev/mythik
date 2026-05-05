// Animation engine public barrel.

export type {
  TransformValue,
  FilterValue,
  KeyframeSnapshot,
  StaggerConfig,
  InlineAnimation,
  AnimationRef,
  StateChangeAnimation,
  ElementAnimations,
  AnimationTrigger,
  AnimationSpec,
} from './types.js';

export type { AnimationContext } from './cascade-types.js';
export { mergeElementAnimations } from './cascade.js';

export { resolveAnimation } from './resolver.js';
export {
  normalizeKeyframeSnapshot,
  parseAtToFraction,
  buildKeyframes,
} from './keyframes-builder.js';
export type { NormalizedKeyframe, NormalizedTransformRN } from './keyframes-builder.js';
export { buildCSSKeyframes } from './css-keyframes.js';
export type { BuiltCSSKeyframes } from './css-keyframes.js';
export { buildReanimatedSpec } from './reanimated-spec.js';
export type { ReanimatedSpec } from './reanimated-spec.js';
export { applyReducedMotion } from './reduced-motion.js';
export {
  validateAnimationCaps,
  validateBackgroundCaps,
  HARD_PER_TRIGGER,
} from './validator.js';
export type {
  AnimationValidationResult,
  BackgroundValidationInput,
} from './validator.js';
