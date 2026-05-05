// useElementAnimations (web) — Layer 2 runner that attaches CSS animations
// to a DOM element ref. Composes active triggers into the CSS `animation`
// shorthand and applies via element.style.animation (no dangerouslySetInnerHTML).
// Keyframes are inserted once into a Constructable StyleSheets singleton
// (or <style>.insertRule fallback) and deduplicated by hash.
//
// Handles all 7 triggers: mount, unmount (imperative via triggerUnmount()),
// hover, focus, active, ambient, stateChange. Event triggers (hover/focus/active)
// are driven by flags in `options` — the consumer (e.g. box primitive) attaches
// listeners and passes boolean state. The hook does NOT attach DOM listeners
// itself (decoupled design).
//
// Performance note: `options.recipes` SHOULD be a stable reference (memoized
// at app bootstrap — ANIMATION_RECIPES from core satisfies this). Passing a
// fresh object literal on each render causes the stateChange subscription to
// tear down and re-establish every commit — correct, but wasteful.

import { useEffect, useMemo, useState, type RefObject } from 'react';
import {
  resolveAnimation,
  buildCSSKeyframes,
  applyReducedMotion,
  mergeElementAnimations,
  toArray,
  type AnimationContext,
  type AnimationRef,
  type AnimationSpec,
  type AnimationTrigger,
  type ElementAnimations,
  type InlineAnimation,
  type StateChangeAnimation,
  type StateStore,
} from 'mythik';
import { registerKeyframes } from './stylesheet-singleton.js';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

/**
 * Param accepted by useElementAnimations for the `animations` slot.
 *
 * Two disjoint shapes:
 *   - ElementAnimations — direct form, keys are animation triggers
 *     (mount/unmount/hover/focus/active/ambient/stateChange). Used when the
 *     consumer has the final merged animations already.
 *   - AnimationContext — cascade form, keys are levels (identity/variant/
 *     template/element). Hook calls mergeElementAnimations() to consolidate.
 *
 * The two keysets never overlap, so runtime discrimination by key presence
 * is unambiguous. Empty object {} is treated as empty ElementAnimations
 * (no animations attached — same as passing undefined).
 */
export type UseElementAnimationsParam =
  | ElementAnimations
  | AnimationContext
  | null
  | undefined;

const TRIGGER_KEYS = [
  'mount',
  'unmount',
  'hover',
  'focus',
  'active',
  'ambient',
  'stateChange',
] as const;

function isAnimationContext(x: unknown): x is AnimationContext {
  if (x === null || typeof x !== 'object') return false;
  return (
    'identity' in x || 'variant' in x || 'template' in x || 'element' in x
  );
}

// Dev-mode guard: the two discriminant keysets (AnimationContext vs
// ElementAnimations triggers) are disjoint by contract. A mixed-key input
// would be silently classified as context and drop the trigger keys — a
// subtle foot-gun. In development we throw to surface the malformation
// immediately; production silently classifies as context (first key wins).
function hasTriggerKey(x: object): boolean {
  for (const k of TRIGGER_KEYS) {
    if (k in x) return true;
  }
  return false;
}

function resolveAnimationsParam(
  param: UseElementAnimationsParam,
): ElementAnimations | undefined {
  if (param === null || param === undefined) return undefined;
  if (isAnimationContext(param)) {
    if (process.env.NODE_ENV !== 'production' && hasTriggerKey(param)) {
      throw new Error(
        'useElementAnimations: received an object with both AnimationContext keys ' +
          '(identity/variant/template/element) AND trigger keys ' +
          '(mount/hover/...). These shapes are disjoint by contract; pass one or the other.',
      );
    }
    return mergeElementAnimations(param) ?? undefined;
  }
  return param;
}

// One-frame buffer at 60fps to guarantee the animation's end frame paints
// before we clear the animation string (prevents the last frame from being
// visually truncated on slower devices). Larger refresh rates (120/144Hz)
// still produce a safe margin.
const FRAME_MARGIN_MS = 16;

export type UseElementAnimationsOptions = {
  recipes: Record<string, InlineAnimation>;
  staggerIndex?: number;
  reducedMotion?: boolean;
  isHovered?: boolean;
  isFocused?: boolean;
  isActive?: boolean;
  store?: StateStore;
};

function matchOn(
  prev: unknown,
  next: unknown,
  on: StateChangeAnimation['on'],
): boolean {
  if (on === undefined || on === 'change') return prev !== next;
  if (on === 'increase')
    return typeof next === 'number' && typeof prev === 'number' && next > prev;
  if (on === 'decrease')
    return typeof next === 'number' && typeof prev === 'number' && next < prev;
  if (on === 'truthy') return !prev && !!next;
  if (on === 'falsy') return !!prev && !next;
  if (typeof on === 'object' && 'equals' in on)
    return prev !== on.equals && next === on.equals;
  return false;
}

function buildSpecFromStateChange(
  cfg: StateChangeAnimation,
  recipes: Record<string, InlineAnimation>,
): AnimationSpec {
  if (cfg.recipe) {
    return resolveAnimation(
      { recipe: cfg.recipe, duration: cfg.duration, easing: cfg.easing },
      recipes,
    );
  }
  if (!cfg.keyframes) {
    throw new Error(
      `stateChange on '${cfg.watch}' must supply either 'recipe' or 'keyframes'`,
    );
  }
  return resolveAnimation(
    {
      keyframes: cfg.keyframes,
      duration: cfg.duration,
      easing: cfg.easing,
    },
    recipes,
  );
}

function parseDebounce(d: StateChangeAnimation['debounce']): number {
  if (d === undefined) return 0;
  if (typeof d === 'number') return d;
  const match = /^(-?\d*\.?\d+)\s*(ms|s)?$/i.exec(d.trim());
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();
  return unit === 's' ? value * 1000 : value;
}

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

function resolveTriggerAnimations(
  refs: AnimationRef | AnimationRef[] | null | undefined,
  trigger: AnimationTrigger,
  recipes: Record<string, InlineAnimation>,
  reducedMotion: boolean,
  staggerIndex: number | undefined,
): string[] {
  const items = toArray(refs);
  const out: string[] = [];
  for (const ref of items) {
    let spec = resolveAnimation(ref, recipes);
    if (reducedMotion) {
      const policy = applyReducedMotion(spec, trigger);
      if (policy === null) continue;
      spec = policy;
    }
    out.push(buildAnimationCSS(spec, staggerIndex));
  }
  return out;
}

export function useElementAnimations<T extends HTMLElement>(
  ref: RefObject<T | null>,
  animationsParam: UseElementAnimationsParam,
  options: UseElementAnimationsOptions,
): { triggerUnmount: () => Promise<void> } {
  const reducedMotion = usePrefersReducedMotion(options.reducedMotion);

  // Resolve the param to a final ElementAnimations shape. If the consumer
  // passed an AnimationContext, merge across the 4 cascade levels; if they
  // passed a direct ElementAnimations, pass through unchanged. null/undefined
  // both become undefined (no animations).
  const animations = useMemo(
    () => resolveAnimationsParam(animationsParam),
    [animationsParam],
  );

  const composedAnimationCSS = useMemo(() => {
    if (!animations) return '';
    const parts: string[] = [];
    parts.push(
      ...resolveTriggerAnimations(
        animations.ambient,
        'ambient',
        options.recipes,
        reducedMotion,
        options.staggerIndex,
      ),
    );
    parts.push(
      ...resolveTriggerAnimations(
        animations.mount,
        'mount',
        options.recipes,
        reducedMotion,
        options.staggerIndex,
      ),
    );
    if (options.isHovered) {
      parts.push(
        ...resolveTriggerAnimations(
          animations.hover,
          'hover',
          options.recipes,
          reducedMotion,
          options.staggerIndex,
        ),
      );
    }
    if (options.isFocused) {
      parts.push(
        ...resolveTriggerAnimations(
          animations.focus,
          'focus',
          options.recipes,
          reducedMotion,
          options.staggerIndex,
        ),
      );
    }
    if (options.isActive) {
      parts.push(
        ...resolveTriggerAnimations(
          animations.active,
          'active',
          options.recipes,
          reducedMotion,
          options.staggerIndex,
        ),
      );
    }
    return parts.join(', ');
  }, [
    animations,
    options.recipes,
    options.staggerIndex,
    options.isHovered,
    options.isFocused,
    options.isActive,
    reducedMotion,
  ]);

  const [transientStateChangeCSS, setTransientStateChangeCSS] = useState<string>('');

  useEffect(() => {
    if (!animations?.stateChange || !options.store) return;
    const store = options.store;
    const configs = Array.isArray(animations.stateChange)
      ? animations.stateChange
      : [animations.stateChange];

    const cleanups: Array<() => void> = [];

    for (const cfg of configs) {
      let prev: unknown = store.get(cfg.watch);
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let clearTimer: ReturnType<typeof setTimeout> | null = null;

      const onChange = (next: unknown) => {
        const match = matchOn(prev, next, cfg.on);
        prev = next;
        if (!match) return;

        const fire = () => {
          let spec = buildSpecFromStateChange(cfg, options.recipes);
          if (reducedMotion) {
            const r = applyReducedMotion(spec, 'stateChange');
            if (r === null) return;
            spec = r;
          }
          const css = buildAnimationCSS(spec, options.staggerIndex);
          setTransientStateChangeCSS(css);
          if (clearTimer) clearTimeout(clearTimer);
          clearTimer = setTimeout(() => {
            setTransientStateChangeCSS('');
            clearTimer = null;
          }, spec.duration + spec.delay + FRAME_MARGIN_MS);
        };

        const debounceMs = parseDebounce(cfg.debounce);
        if (debounceMs > 0) {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(fire, debounceMs);
        } else {
          fire();
        }
      };

      const unsub = store.subscribePath(cfg.watch, onChange);
      cleanups.push(() => {
        unsub();
        if (debounceTimer) clearTimeout(debounceTimer);
        if (clearTimer) {
          // I1 fix: if effect re-runs mid-transient, the pending CSS-clear
          // setTimeout is canceled — but the transient CSS is still applied.
          // Reset transient state so the next composed-animation write clears it.
          clearTimeout(clearTimer);
          setTransientStateChangeCSS('');
        }
      });
    }

    return () => {
      for (const c of cleanups) c();
    };
  }, [animations, options.store, options.recipes, options.staggerIndex, reducedMotion]);

  const finalAnimationCSS = useMemo(() => {
    if (!transientStateChangeCSS) return composedAnimationCSS;
    return composedAnimationCSS
      ? `${composedAnimationCSS}, ${transientStateChangeCSS}`
      : transientStateChangeCSS;
  }, [composedAnimationCSS, transientStateChangeCSS]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.animation = finalAnimationCSS;
  }, [finalAnimationCSS, ref]);

  const triggerUnmount = async (): Promise<void> => {
    const el = ref.current;
    if (!el || !animations?.unmount) return;
    const specs = toArray(animations.unmount);
    if (specs.length === 0) return;

    const css = resolveTriggerAnimations(
      specs,
      'unmount',
      options.recipes,
      reducedMotion,
      options.staggerIndex,
    );
    if (css.length === 0) return;

    el.style.animation = css.join(', ');

    const resolvedSpecs = specs.map((s) => resolveAnimation(s, options.recipes));
    const maxDuration = Math.max(
      ...resolvedSpecs.map((s) => s.duration + s.delay),
    );
    await new Promise<void>((resolve) => setTimeout(resolve, maxDuration));
  };

  return { triggerUnmount };
}
