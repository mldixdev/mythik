// resolveAnimation — Layer 1 pure resolver.
// Takes AnimationRef (recipe reference or inline animation) + recipe registry,
// produces a fully-normalized AnimationSpec with parsed durations and
// default values filled in.

import type {
  AnimationRef,
  AnimationSpec,
  InlineAnimation,
} from './types.js';

function parseDuration(d: string | number | undefined, fallback: number): number {
  if (d === undefined) return fallback;
  if (typeof d === 'number') return d;
  const match = /^(-?\d*\.?\d+)\s*(ms|s)?$/i.exec(d.trim());
  if (!match) {
    throw new Error(`invalid duration value: ${d}`);
  }
  const value = parseFloat(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();
  return unit === 's' ? value * 1000 : value;
}

function isInline(ref: AnimationRef): ref is InlineAnimation {
  return 'keyframes' in ref;
}

export function resolveAnimation(
  ref: AnimationRef,
  recipes: Record<string, InlineAnimation>,
): AnimationSpec {
  // Runtime guard: reject malformed refs that specify both a recipe and inline
  // keyframes. TypeScript blocks this at compile time via the union, but JSON
  // input has no such protection.
  if (isInline(ref) && 'recipe' in ref) {
    throw new Error(
      `animation ref cannot have both 'recipe' and 'keyframes' — pick one`,
    );
  }

  let base: InlineAnimation;
  let overrides: Partial<InlineAnimation> = {};

  if (isInline(ref)) {
    base = ref;
  } else {
    const recipe = recipes[ref.recipe];
    if (!recipe) {
      throw new Error(`unknown recipe: ${ref.recipe}`);
    }
    base = recipe;
    overrides = {
      duration: ref.duration,
      easing: ref.easing,
      delay: ref.delay,
      iterations: ref.iterations,
      stagger: ref.stagger,
      essential: ref.essential,
    };
  }

  // Defensive validation of the keyframe sequence. Failing early here
  // produces a clear error; skipping lets the CSS/Reanimated builders emit
  // inert or broken output at runtime. Downstream color-value validation
  // (hex/rgba/hsl/oklch/named) is deferred — the resolver trusts string
  // values as-is and lets the platform renderer reject invalid colors.
  if (base.keyframes.length === 0) {
    throw new Error(`animation has no keyframes`);
  }
  const fractions = base.keyframes.map((kf) => {
    const match = /^(-?\d*\.?\d+)%$/.exec(kf.at.trim());
    if (!match) {
      throw new Error(`invalid keyframe 'at': ${kf.at}`);
    }
    const value = parseFloat(match[1]);
    if (value < 0 || value > 100) {
      throw new Error(`keyframe 'at' must be in [0%, 100%]: got ${kf.at}`);
    }
    return value;
  });
  for (let i = 1; i < fractions.length; i++) {
    if (fractions[i] < fractions[i - 1]) {
      throw new Error(
        `keyframe 'at' values must be monotonically non-decreasing; got ${base.keyframes[i - 1].at} \u2192 ${base.keyframes[i].at}`,
      );
    }
  }

  const duration = parseDuration(overrides.duration ?? base.duration, 200);
  const delay = parseDuration(overrides.delay ?? base.delay, 0);

  return {
    keyframes: base.keyframes,
    duration,
    easing: overrides.easing ?? base.easing ?? 'ease-out',
    delay,
    iterations: overrides.iterations ?? base.iterations ?? 1,
    direction: base.direction ?? 'normal',
    fillMode: base.fillMode ?? 'both',
    stagger: overrides.stagger ?? base.stagger,
    essential: overrides.essential ?? base.essential ?? false,
  };
}
