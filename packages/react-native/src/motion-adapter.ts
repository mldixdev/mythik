import type { MotionAnimationProps, MotionTransitionConfig, MotionEasing } from './types.js';

/** Rename x/y → translateX/translateY in animation state objects */
function translateMotionProps(props: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'x') result.translateX = value;
    else if (key === 'y') result.translateY = value;
    else result[key] = value;
  }
  return result;
}

/**
 * Map Framer Motion ease values to Reanimated-compatible easing.
 * Framer Motion uses strings ("easeIn") or cubic-bezier arrays ([0.42, 0, 0.58, 1]).
 * MotionView accepts string shortcuts or bezier objects.
 */
function translateEasing(ease: unknown): MotionEasing | undefined {
  if (!ease) return undefined;

  // Cubic-bezier array → structured object for render-time resolution
  if (Array.isArray(ease) && ease.length === 4 && ease.every(v => typeof v === 'number')) {
    return { type: 'bezier', x1: ease[0], y1: ease[1], x2: ease[2], y2: ease[3] };
  }

  // String mapping — Framer Motion names → Reanimated-compatible names
  if (typeof ease === 'string') {
    const EASE_MAP: Record<string, string> = {
      linear: 'linear',
      easeIn: 'easeIn',
      easeOut: 'easeOut',
      easeInOut: 'easeInOut',
    };
    return EASE_MAP[ease] ?? ease;
  }

  // Unknown ease type — pass through as string for best-effort compatibility
  return String(ease);
}

/**
 * Convert duration/delay from Framer Motion seconds to ms.
 * Framer Motion ALWAYS uses seconds. No heuristic needed —
 * the framework controls the input format via TransitionConfig.
 */
function secondsToMs(value: unknown): number | undefined {
  if (typeof value !== 'number') return undefined;
  return Math.round(value * 1000);
}

/** Convert a Motion-style transition config to MotionView transition config */
function translateTransition(transition: Record<string, unknown> | undefined): MotionTransitionConfig | undefined {
  if (!transition) return undefined;

  const result: MotionTransitionConfig = {};

  // Type: spring or timing (default)
  if (transition.type === 'spring') {
    result.type = 'spring';
    if (typeof transition.damping === 'number') result.damping = transition.damping;
    if (typeof transition.stiffness === 'number') result.stiffness = transition.stiffness;
    if (typeof transition.mass === 'number') result.mass = transition.mass;
  } else {
    result.type = 'timing';
  }

  // Duration + delay: always convert from seconds to ms
  if (transition.duration !== undefined) result.duration = secondsToMs(transition.duration);
  if (transition.delay !== undefined) result.delay = secondsToMs(transition.delay);

  // Easing (timing only, but harmless to include)
  if (transition.ease) result.easing = translateEasing(transition.ease);

  // Stagger support: convert seconds to ms (consumed by future container animations)
  if (typeof transition.staggerChildren === 'number') {
    result.staggerChildren = secondsToMs(transition.staggerChildren);
  }
  if (typeof transition.delayChildren === 'number') {
    result.delayChildren = secondsToMs(transition.delayChildren);
  }

  return result;
}

/**
 * Convert spec motion config (Motion/Framer Motion format) to MotionView props.
 * motion.initial → from, motion.animate → animate, motion.exit → exit
 */
export function toMotionViewProps(motion: Record<string, unknown> | undefined): MotionAnimationProps {
  if (!motion) return {};

  const result: MotionAnimationProps = {
    from: translateMotionProps(motion.initial as Record<string, unknown>),
    animate: translateMotionProps(motion.animate as Record<string, unknown>),
    exit: translateMotionProps(motion.exit as Record<string, unknown>),
    transition: translateTransition(motion.transition as Record<string, unknown>),
  };

  if (typeof motion.layoutId === 'string') {
    result.layoutId = motion.layoutId;
  }

  return result;
}

/**
 * Merge hover + active styles into a single pressed style object.
 * On mobile, touch = hover + active simultaneously.
 */
export function mergeInteractionStyles(
  hover: Record<string, unknown> | undefined,
  active: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!hover && !active) return undefined;
  return { ...hover, ...active };
}
