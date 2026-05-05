// useElementAnimations (RN) — Layer 2 runner using Reanimated.
// Composes active trigger contributions into an animated style object that
// the consumer spreads onto <Animated.View>. Each trigger supports an array
// of animations (up to HARD_PER_TRIGGER = hard-cap from validator); each
// ref gets its own useSharedValue driving progress (0 → 1), and
// useAnimatedStyle composes ALL active contributions via composeRNStyle.
//
// Handles all 7 triggers: mount, unmount (imperative via triggerUnmount()),
// hover, focus, active, ambient, stateChange.
//
// Event triggers (hover/focus/active) are driven by flags in `options` —
// consumer attaches Pressable/focus listeners and passes boolean state.
// The hook does NOT attach listeners itself (decoupled design, matches web).
//
// Performance notes:
//   - `options.recipes` SHOULD be a stable reference (memoized at app
//     bootstrap — ANIMATION_RECIPES from core satisfies this).
//   - `animations` SHOULD be a stable reference (derived from the element
//     spec, not constructed inline as a literal). Unstable `animations`
//     causes the stateChange subscription to tear down and re-establish
//     every commit — correct, but wasteful of subscribe/unsubscribe overhead.

import { useEffect, useMemo } from 'react';
import {
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import {
  resolveAnimation,
  buildReanimatedSpec,
  applyReducedMotion,
  mergeElementAnimations,
  toArray,
  HARD_PER_TRIGGER,
  type AnimationContext,
  type AnimationRef,
  type AnimationSpec,
  type AnimationTrigger,
  type ElementAnimations,
  type InlineAnimation,
  type ReanimatedSpec,
  type StateChangeAnimation,
  type StateStore,
} from 'mythik';
import { composeRNStyle, type TriggerContribution } from './compose-rn-style.js';
import { useSharedValueArray } from './use-shared-value-array.js';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

/**
 * Param accepted by useElementAnimations (RN) for the `animations` slot.
 * See web hook for full discriminant doc.
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

// Dev-mode guard — see web hook for full rationale. Mixed-key inputs are
// a latent foot-gun; throwing in dev surfaces them immediately.
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

export type UseElementAnimationsOptions = {
  recipes: Record<string, InlineAnimation>;
  staggerIndex?: number;
  reducedMotion?: boolean;
  isHovered?: boolean;
  isFocused?: boolean;
  isActive?: boolean;
  store?: StateStore;
};

type TriggerResolution = {
  spec: AnimationSpec;
  rspec: ReanimatedSpec;
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

function resolveForStateChange(
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
    { keyframes: cfg.keyframes, duration: cfg.duration, easing: cfg.easing },
    recipes,
  );
}

function parseDurationMs(d: string | number): number {
  if (typeof d === 'number') return d;
  const match = /^(-?\d*\.?\d+)\s*(ms|s)?$/i.exec(d.trim());
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();
  return unit === 's' ? value * 1000 : value;
}

function parseDebounce(d: StateChangeAnimation['debounce']): number {
  if (d === undefined) return 0;
  return parseDurationMs(d);
}

function resolveTrigger(
  ref: AnimationRef,
  trigger: AnimationTrigger,
  recipes: Record<string, InlineAnimation>,
  reducedMotion: boolean,
): TriggerResolution | null {
  let spec = resolveAnimation(ref, recipes);
  if (reducedMotion) {
    const r = applyReducedMotion(spec, trigger);
    if (r === null) return null;
    spec = r;
  }
  return { spec, rspec: buildReanimatedSpec(spec) };
}

function resolveTriggerArray(
  refs: AnimationRef | AnimationRef[] | null | undefined,
  trigger: AnimationTrigger,
  recipes: Record<string, InlineAnimation>,
  reducedMotion: boolean,
): TriggerResolution[] {
  const items = toArray(refs).slice(0, HARD_PER_TRIGGER);
  const out: TriggerResolution[] = [];
  for (const ref of items) {
    const r = resolveTrigger(ref, trigger, recipes, reducedMotion);
    if (r) out.push(r);
  }
  return out;
}

function computeStaggerDelay(
  spec: AnimationSpec,
  staggerIndex: number | undefined,
): number {
  if (!spec.stagger) return spec.delay;
  return spec.delay + spec.stagger.delay * (staggerIndex ?? 0);
}

export function useElementAnimations(
  animationsParam: UseElementAnimationsParam,
  options: UseElementAnimationsOptions,
): {
  animatedStyle: Record<string, unknown>;
  triggerUnmount: () => Promise<void>;
} {
  const reducedMotion = usePrefersReducedMotion(options.reducedMotion);

  // Resolve the param to a final ElementAnimations shape. If AnimationContext,
  // merge across the 4 cascade levels; if direct ElementAnimations, pass
  // through unchanged. null/undefined both become undefined.
  const animations = useMemo(
    () => resolveAnimationsParam(animationsParam),
    [animationsParam],
  );

  const resolved = useMemo(
    () => ({
      mount: resolveTriggerArray(animations?.mount, 'mount', options.recipes, reducedMotion),
      ambient: resolveTriggerArray(animations?.ambient, 'ambient', options.recipes, reducedMotion),
      hover: resolveTriggerArray(animations?.hover, 'hover', options.recipes, reducedMotion),
      focus: resolveTriggerArray(animations?.focus, 'focus', options.recipes, reducedMotion),
      active: resolveTriggerArray(animations?.active, 'active', options.recipes, reducedMotion),
      unmount: resolveTriggerArray(animations?.unmount, 'unmount', options.recipes, reducedMotion),
    }),
    [animations, options.recipes, reducedMotion],
  );

  // stateChange resolutions per config (also up to HARD_PER_TRIGGER).
  const stateChangeResolutions = useMemo<TriggerResolution[]>(() => {
    if (!animations?.stateChange) return [];
    const configs = toArray(animations.stateChange).slice(0, HARD_PER_TRIGGER);
    const out: TriggerResolution[] = [];
    for (const cfg of configs) {
      let spec = resolveForStateChange(cfg, options.recipes);
      if (reducedMotion) {
        const r = applyReducedMotion(spec, 'stateChange');
        if (r === null) continue;
        spec = r;
      }
      out.push({ spec, rspec: buildReanimatedSpec(spec) });
    }
    return out;
  }, [animations?.stateChange, options.recipes, reducedMotion]);

  // Fixed-size SV pools per trigger. Using only resolved[trigger].length of
  // them; unused ones stay at value 0 and contribute nothing to composed style.
  const mountSVs = useSharedValueArray(HARD_PER_TRIGGER);
  const ambientSVs = useSharedValueArray(HARD_PER_TRIGGER);
  const hoverSVs = useSharedValueArray(HARD_PER_TRIGGER);
  const focusSVs = useSharedValueArray(HARD_PER_TRIGGER);
  const activeSVs = useSharedValueArray(HARD_PER_TRIGGER);
  const unmountSVs = useSharedValueArray(HARD_PER_TRIGGER);
  const stateChangeSVs = useSharedValueArray(HARD_PER_TRIGGER);

  // Mount + ambient driver. Snaps SVs to 0 before reassignment so an
  // in-flight animation doesn't "continue from prior progress" on re-run.
  // Also resets SVs for triggers that transitioned to empty (leak prevention
  // — Reanimated's withRepeat would otherwise run indefinitely on the UI thread).
  useEffect(() => {
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved.mount[i];
      mountSVs[i].value = 0;
      if (res) {
        const totalDelay = computeStaggerDelay(res.spec, options.staggerIndex);
        mountSVs[i].value = withDelay(
          totalDelay,
          withTiming(1, { duration: res.rspec.timing.duration }),
        );
      }
    }
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved.ambient[i];
      ambientSVs[i].value = 0;
      if (res) {
        const iterations =
          res.rspec.timing.iterations === 'infinite'
            ? -1
            : (res.rspec.timing.iterations as number);
        ambientSVs[i].value = withRepeat(
          withTiming(1, { duration: res.rspec.timing.duration }),
          iterations,
          res.rspec.timing.reverse,
        );
      }
    }
  }, [resolved.mount, resolved.ambient, options.staggerIndex, mountSVs, ambientSVs]);

  useEffect(() => {
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved.hover[i];
      if (res) {
        hoverSVs[i].value = withTiming(options.isHovered ? 1 : 0, {
          duration: res.rspec.timing.duration,
        });
      } else {
        hoverSVs[i].value = 0;
      }
    }
  }, [options.isHovered, resolved.hover, hoverSVs]);

  useEffect(() => {
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved.focus[i];
      if (res) {
        focusSVs[i].value = withTiming(options.isFocused ? 1 : 0, {
          duration: res.rspec.timing.duration,
        });
      } else {
        focusSVs[i].value = 0;
      }
    }
  }, [options.isFocused, resolved.focus, focusSVs]);

  useEffect(() => {
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved.active[i];
      if (res) {
        activeSVs[i].value = withTiming(options.isActive ? 1 : 0, {
          duration: res.rspec.timing.duration,
        });
      } else {
        activeSVs[i].value = 0;
      }
    }
  }, [options.isActive, resolved.active, activeSVs]);

  // stateChange subscriptions — one per config.
  useEffect(() => {
    if (!animations?.stateChange || !options.store) return;
    const store = options.store;
    const configs = toArray(animations.stateChange).slice(0, HARD_PER_TRIGGER);

    const cleanups: Array<() => void> = [];

    configs.forEach((cfg, i) => {
      let prev: unknown = store.get(cfg.watch);
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;

      const onChange = (next: unknown) => {
        const match = matchOn(prev, next, cfg.on);
        prev = next;
        if (!match) return;

        const fire = () => {
          const duration = parseDurationMs(cfg.duration);
          stateChangeSVs[i].value = 0;
          stateChangeSVs[i].value = withSequence(
            withTiming(1, { duration: duration / 2 }),
            withTiming(0, { duration: duration / 2 }),
          );
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
      });
    });

    return () => {
      for (const c of cleanups) c();
    };
  }, [animations?.stateChange, options.store, stateChangeSVs]);

  const animatedStyle = useAnimatedStyle(() => {
    const contributions: TriggerContribution[] = [];

    // Priority order: mount < ambient < focus < hover < active < unmount < stateChange.
    // Later contributions override scalars and transform keys.
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved.mount[i];
      if (res) contributions.push({ progress: mountSVs[i].value, spec: res.rspec });
    }
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved.ambient[i];
      if (res) contributions.push({ progress: ambientSVs[i].value, spec: res.rspec });
    }
    if (options.isFocused) {
      for (let i = 0; i < HARD_PER_TRIGGER; i++) {
        const res = resolved.focus[i];
        if (res) contributions.push({ progress: focusSVs[i].value, spec: res.rspec });
      }
    }
    if (options.isHovered) {
      for (let i = 0; i < HARD_PER_TRIGGER; i++) {
        const res = resolved.hover[i];
        if (res) contributions.push({ progress: hoverSVs[i].value, spec: res.rspec });
      }
    }
    if (options.isActive) {
      for (let i = 0; i < HARD_PER_TRIGGER; i++) {
        const res = resolved.active[i];
        if (res) contributions.push({ progress: activeSVs[i].value, spec: res.rspec });
      }
    }
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = resolved.unmount[i];
      if (res && unmountSVs[i].value > 0) {
        contributions.push({ progress: unmountSVs[i].value, spec: res.rspec });
      }
    }
    for (let i = 0; i < HARD_PER_TRIGGER; i++) {
      const res = stateChangeResolutions[i];
      if (res && stateChangeSVs[i].value > 0) {
        contributions.push({ progress: stateChangeSVs[i].value, spec: res.rspec });
      }
    }

    return composeRNStyle(contributions, interpolate, interpolateColor);
  });

  const triggerUnmount = async (): Promise<void> => {
    if (resolved.unmount.length === 0) return;
    let maxTotal = 0;
    for (let i = 0; i < resolved.unmount.length; i++) {
      const res = resolved.unmount[i];
      const r = res.rspec;
      unmountSVs[i].value = withDelay(
        r.timing.delay,
        withTiming(1, { duration: r.timing.duration }),
      );
      maxTotal = Math.max(maxTotal, r.timing.duration + r.timing.delay);
    }
    await new Promise<void>((res) => setTimeout(res, maxTotal));
  };

  return { animatedStyle, triggerUnmount };
}
