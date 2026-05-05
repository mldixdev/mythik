// useShapeAnimations (web) — Layer 3 runner for SVG-child animations.
//
// Consumes the same ElementAnimations contract as useElementAnimations but
// targets an SVG child (path, circle, rect, …) via its attribute/style
// surface. Plan 3 scope is strictly `ambient` — SVG children have no
// hover/focus/active affordance (they don't receive pointer events in the
// decorative-blob use case) and no mount/unmount ceremony distinct from
// their parent element's mount.
//
// Why a separate hook instead of reusing useElementAnimations?
//   - Simpler surface: no options.isHovered/isFocused/isActive, no store,
//     no triggerUnmount. Matches Layer 3's narrow use case.
//   - Refs typed to SVGElement so consumers (BlobLayer, icon primitives)
//     get correct type inference.
//   - useElementAnimations pulls in StateStore + reanimated imports that
//     shape-level consumers don't need.
//
// Keyframes are registered once into the plan-2 stylesheet singleton
// (`registerKeyframes`) and deduplicated by hash. Multiple shape instances
// with the same recipe share one CSS rule — zero per-instance duplication.
//
// Cleanup: on unmount (or animations→null transition), `el.style.animation`
// is cleared. The CSSOM keyframe rule stays registered (its cost is one
// @keyframes block per unique recipe; global lifetime is fine).
//
// Performance: `options.recipes` SHOULD be a stable reference (typically
// ANIMATION_RECIPES from core, which is module-scope). Inline object
// literals invalidate the useMemo every render — correct but wasteful,
// especially when a BlobLayer iterates over many blob instances.

import { useEffect, useMemo, type RefObject } from 'react';
import {
  resolveAnimation,
  buildCSSKeyframes,
  applyReducedMotion,
  toArray,
  type AnimationRef,
  type AnimationSpec,
  type ElementAnimations,
  type InlineAnimation,
} from 'mythik';
import { registerKeyframes } from './stylesheet-singleton.js';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

export type UseShapeAnimationsOptions = {
  /** Recipe registry — typically ANIMATION_RECIPES from core. */
  recipes: Record<string, InlineAnimation>;
  /** Index for stagger-delay multiplier on animations with `stagger` set. */
  staggerIndex?: number;
  /** Override prefers-reduced-motion for tests / user preference. */
  reducedMotion?: boolean;
};

/**
 * Compose a CSS `animation` shorthand from a resolved AnimationSpec.
 *
 * Order matches the CSS spec:
 *   name duration easing delay iteration-count direction fill-mode
 *
 * Side effect: registers the keyframes rule into the singleton stylesheet
 * (idempotent via `registerKeyframes`'s internal dedup).
 */
function buildAnimationCSS(
  spec: AnimationSpec,
  staggerIndex: number | undefined,
): string {
  const built = buildCSSKeyframes(spec);
  registerKeyframes(built.name, built.keyframesText);
  const staggerDelay = spec.stagger ? spec.stagger.delay * (staggerIndex ?? 0) : 0;
  const delayMs = spec.delay + staggerDelay;
  const iterStr = spec.iterations === 'infinite' ? 'infinite' : `${spec.iterations}`;
  return `${built.name} ${spec.duration}ms ${spec.easing} ${delayMs}ms ${iterStr} ${spec.direction} ${spec.fillMode}`;
}

/**
 * Attach ambient CSS animations to an SVG child element.
 *
 * @param ref        Ref to an SVG element (path, circle, rect, g, …).
 * @param animations ElementAnimations (Layer 3 reads only `ambient`) or
 *                   null for "no animations".
 * @param options    Recipe registry, optional stagger index, reduced-motion
 *                   override.
 */
export function useShapeAnimations<T extends SVGElement>(
  ref: RefObject<T | null>,
  animations: ElementAnimations | null,
  options: UseShapeAnimationsOptions,
): void {
  const reducedMotion = usePrefersReducedMotion(options.reducedMotion);

  // Dev-mode guard: Layer 3 scope is strictly `ambient`. If the consumer
  // passes hover/mount/etc., the trigger is silently dropped in production
  // (robust against being fed a full ElementAnimations object from a
  // cascade merge). In dev we warn to surface a likely mistake — usually
  // the consumer meant useElementAnimations. Runtime behavior unchanged.
  if (process.env.NODE_ENV !== 'production' && animations) {
    const extras: string[] = [];
    for (const key of ['mount', 'unmount', 'hover', 'focus', 'active', 'stateChange'] as const) {
      if (key in animations && animations[key] !== undefined && animations[key] !== null) {
        extras.push(key);
      }
    }
    if (extras.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `useShapeAnimations: ignoring non-ambient triggers [${extras.join(', ')}]. ` +
          'Use useElementAnimations for interactive/mount animations; shapes only support ambient.',
      );
    }
  }

  // Compose the `animation` shorthand string from every ambient entry.
  // Memoized on inputs so a re-render with the same refs is cheap.
  const animationCSS = useMemo(() => {
    if (!animations) return '';
    const ambient = animations.ambient;
    if (!ambient) return '';

    const refs: AnimationRef[] = toArray(ambient);
    const parts: string[] = [];
    for (const animRef of refs) {
      let spec = resolveAnimation(animRef, options.recipes);
      if (reducedMotion) {
        const policy = applyReducedMotion(spec, 'ambient');
        if (policy === null) continue;
        spec = policy;
      }
      parts.push(buildAnimationCSS(spec, options.staggerIndex));
    }
    return parts.join(', ');
  }, [animations, options.recipes, options.staggerIndex, reducedMotion]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // SVG elements' `style` surface is the same property-style API as
    // HTMLElement's for CSS animation properties in all browsers plan 3
    // targets; jsdom mirrors that. No attribute-write path needed.
    el.style.animation = animationCSS;
    return () => {
      // Graceful cleanup on unmount or next effect re-run. Accessing
      // `el.style` post-unmount is safe — the element reference stays
      // valid until React releases it; the DOM node is already detached
      // so the write is a no-op.
      el.style.animation = '';
    };
  }, [animationCSS, ref]);
}
