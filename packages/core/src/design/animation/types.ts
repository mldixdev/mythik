// Animation engine v1 types (plan 2 — Deep Backgrounds & Motion milestone)
// Pure type definitions; no runtime. Consumed by Layer 1 resolvers
// (resolveAnimation, buildCSSKeyframes, buildReanimatedSpec) and Layer 2
// runners (useElementAnimations in mythik-react and
// mythik-react-native).

export type TransformValue = {
  translateX?: number | string;
  translateY?: number | string;
  scale?: number | { x: number; y: number };
  rotate?: number | string;
  skewX?: number;
  skewY?: number;
};

export type FilterValue = {
  blur?: number;
  brightness?: number;
  saturate?: number;
};

export type KeyframeSnapshot = {
  at: string;
  opacity?: number;
  transform?: TransformValue;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number | string;
  borderWidth?: number;
  color?: string;
  filter?: FilterValue;
  /**
   * CSS box-shadow value as a literal shorthand string
   * (e.g. `'0 0 20px 4px rgba(99,102,241,0.45)'` or `'none'`).
   * Web-only: emitted as `box-shadow: <value>` in CSS keyframes.
   * RN omits this (same policy as `filter`) — RN's shadow system is a
   * set of discrete props (shadowColor/Offset/Radius/Opacity on iOS,
   * elevation on Android) with no direct string-parseable equivalent.
   * A future framework feature (plan 3+) can add per-platform mapping.
   */
  boxShadow?: string;
};

export type StaggerConfig = {
  delay: number;
  from?: 0 | 'last' | 'center';
};

export type InlineAnimation = {
  keyframes: KeyframeSnapshot[];
  duration: string | number;
  easing?: string;
  delay?: string | number;
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  stagger?: StaggerConfig;
  essential?: boolean;
};

export type AnimationRef =
  | {
      recipe: string;
      duration?: string | number;
      easing?: string;
      delay?: string | number;
      iterations?: number | 'infinite';
      stagger?: StaggerConfig;
      essential?: boolean;
    }
  | InlineAnimation;

/**
 * Animation fired when a watched state path changes.
 *
 * Design note (symmetric keyframes): stateChange animations are intended as
 * transient pulses that return to baseline. Keyframes should start AND end
 * at the same visual state (e.g. `pop`: scale 1 → 1.1 → 1). Asymmetric
 * keyframes combined with `fillMode: 'forwards'` on the underlying recipe
 * will cause a visible snap-back when the transient CSS clears — avoid
 * unless the snap-back is the intended UX.
 *
 * Design note (single-fire): stateChange does not expose iterations or
 * direction. A stateChange fire is one animation from start to end. For
 * repeating behavior on state change, use `ambient` with conditional
 * enablement via `$cond` in the spec layer (plan 3 cascade).
 */
export type StateChangeAnimation = {
  watch: string;
  on?: 'change' | 'increase' | 'decrease' | 'truthy' | 'falsy' | { equals: unknown };
  recipe?: string;
  keyframes?: KeyframeSnapshot[];
  duration: string | number;
  easing?: string;
  debounce?: string | number;
};

export type ElementAnimations = {
  mount?: AnimationRef | AnimationRef[] | null;
  unmount?: AnimationRef | AnimationRef[] | null;
  hover?: AnimationRef | AnimationRef[] | null;
  focus?: AnimationRef | AnimationRef[] | null;
  active?: AnimationRef | AnimationRef[] | null;
  ambient?: AnimationRef | AnimationRef[] | null;
  stateChange?: StateChangeAnimation | StateChangeAnimation[] | null;
};

export type AnimationTrigger = keyof ElementAnimations;

export type AnimationSpec = {
  keyframes: KeyframeSnapshot[];
  duration: number;
  easing: string;
  delay: number;
  iterations: number | 'infinite';
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  stagger?: StaggerConfig;
  essential: boolean;
};
