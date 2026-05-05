import type { ResolveFn } from '../types.js';

export interface MotionStep {
  target: string;
  animation: string;
  duration: unknown; // Expression — resolved to string/number
  delay?: number;
  stagger?: number;
}

export interface MotionSequence {
  sequence: MotionStep[];
}

export interface MotionConfig {
  onMount?: MotionSequence;
  onEnter?: MotionSequence;
  onExit?: MotionSequence;
  onVisible?: MotionSequence;
  onStateChange?: {
    path: string;
    animation: string;
    duration: unknown;
  };
}

export interface ResolvedMotionStep {
  target: string;
  animation: string;
  duration: string | number;
  delay: number;
  stagger: number;
}

export interface ResolvedMotionSequence {
  steps: ResolvedMotionStep[];
}

/**
 * Resolve a motion config's expressions (e.g. $token references in duration).
 */
export function resolveMotionConfig(
  config: Record<string, unknown>,
  resolve: ResolveFn,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [trigger, value] of Object.entries(config)) {
    if (value && typeof value === 'object' && 'sequence' in (value as Record<string, unknown>)) {
      const seq = (value as { sequence: MotionStep[] }).sequence;
      resolved[trigger] = {
        steps: seq.map((step) => ({
          target: step.target,
          animation: step.animation,
          duration: resolve(step.duration),
          delay: step.delay ?? 0,
          stagger: step.stagger ?? 0,
        })),
      };
    } else if (value && typeof value === 'object') {
      // onStateChange or similar single-animation config
      const obj = value as Record<string, unknown>;
      resolved[trigger] = {
        ...obj,
        duration: obj.duration ? resolve(obj.duration) : undefined,
      };
    } else {
      resolved[trigger] = value;
    }
  }

  return resolved;
}

/**
 * Calculate the timeline of a motion sequence.
 * Returns an array of { target, animation, startMs, durationMs } for the renderer to execute.
 */
export function calculateTimeline(sequence: ResolvedMotionSequence): Array<{
  target: string;
  animation: string;
  startMs: number;
  durationMs: number;
}> {
  const timeline: Array<{ target: string; animation: string; startMs: number; durationMs: number }> = [];
  let currentTime = 0;

  for (const step of sequence.steps) {
    const durationMs = parseDuration(step.duration);
    const delayMs = step.delay;

    if (step.stagger > 0) {
      // Staggered: each instance of the target starts offset by stagger ms
      // The renderer handles the actual stagger count based on children
      timeline.push({
        target: step.target,
        animation: step.animation,
        startMs: currentTime + delayMs,
        durationMs,
      });
    } else {
      timeline.push({
        target: step.target,
        animation: step.animation,
        startMs: currentTime + delayMs,
        durationMs,
      });
    }

    currentTime += delayMs + durationMs;
  }

  return timeline;
}

/**
 * Parse a duration value to milliseconds.
 * Accepts: number (ms), "150ms", "0.3s", "250ms ease-out" (extracts the time part)
 */
function parseDuration(value: string | number): number {
  if (typeof value === 'number') return value;
  const match = value.match(/^(\d+(?:\.\d+)?)(ms|s)?/);
  if (!match) return 250; // default
  const num = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 's') return num * 1000;
  return num; // ms or no unit
}
