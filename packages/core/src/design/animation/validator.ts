// Validator — soft/hard performance gates per master design spec.
//
// Two separate exported functions (same file, shared result shape):
//
//   - validateAnimationCaps: per-element animation caps
//       animations per trigger (array length):  soft=3,  hard=6  (>= semantics)
//       triggers with animations per element:   soft=5,  hard=7  (= all triggers)
//       Also: web-only-recipe discoverability warnings.
//
//   - validateBackgroundCaps (Task 9): per-background-layer caps
//       blobs per background:            soft=8,   hard=16    (>  semantics)
//       layers per background:           soft=6,   hard=10    (>  semantics)
//       custom-svg path length (chars):  soft=500, hard=2000  (>  semantics)
//       motion dimensions per blob:      soft=2,   hard=3     (>  semantics)
//
// Note the threshold semantics asymmetry:
//   validateAnimationCaps uses `length >= CAP` (at-or-over the cap triggers).
//   validateBackgroundCaps uses `length >  CAP` (strictly above the cap
//     triggers). The design spec tables for plan 2 vs plan 3 name the caps
//     differently: plan 2's SOFT_PER_TRIGGER=3 means "at length 3, warn"
//     (so length 2 is fine); plan 3's blobsSoft=8 means "up to 8 is fine,
//     9+ warn" (so length 8 is at the cap, not over). Keeping both literal
//     per their specs; the soft/hard field names document the boundary in
//     each context.
//
// The caller decides whether to log warnings, throw on errors, or fail the
// spec (e.g. `mythik validate` typically logs warnings and errors both).

import type { ElementAnimations, AnimationTrigger, AnimationRef, StateChangeAnimation } from './types.js';
import type { BlobInstance } from '../background/blobs/types.js';
import { WEB_ONLY_RECIPES } from '../recipes/animations.js';

function collectRecipeNames(
  value: AnimationRef | AnimationRef[] | StateChangeAnimation | StateChangeAnimation[],
): string[] {
  const items = Array.isArray(value) ? value : [value];
  const names: string[] = [];
  for (const item of items) {
    // AnimationRef and StateChangeAnimation both have an optional `recipe` field
    const recipe = (item as { recipe?: string }).recipe;
    if (typeof recipe === 'string') names.push(recipe);
  }
  return names;
}

const SOFT_PER_TRIGGER = 3;
/**
 * Hard cap on animations per trigger (array length). Exported for consumers
 * that need to allocate per-trigger pools matching the validator (e.g. RN
 * runners using `useSharedValueArray(HARD_PER_TRIGGER)`) — centralizing
 * here prevents pool/validator drift when the cap changes.
 */
export const HARD_PER_TRIGGER = 6;
const SOFT_TRIGGERS = 5;
const HARD_TRIGGERS = 7;

export type AnimationValidationResult = {
  warnings: string[];
  errors: string[];
};

export function validateAnimationCaps(animations: ElementAnimations): AnimationValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const triggers: AnimationTrigger[] = [
    'mount', 'unmount', 'hover', 'focus', 'active', 'ambient', 'stateChange',
  ];

  let activeTriggerCount = 0;

  for (const t of triggers) {
    const val = animations[t];
    if (val === undefined || val === null) continue;
    activeTriggerCount++;

    const length = Array.isArray(val) ? val.length : 1;
    if (length >= HARD_PER_TRIGGER) {
      errors.push(
        `trigger '${t}' has ${length} animations — hard-cap (${HARD_PER_TRIGGER}) exceeded; split into multiple elements or compose into a single animation with more keyframes`,
      );
    } else if (length >= SOFT_PER_TRIGGER) {
      warnings.push(
        `trigger '${t}' has ${length} animations — soft-cap (${SOFT_PER_TRIGGER}) reached; review whether all are necessary`,
      );
    }

    // Web-only recipe warning — silent no-op on RN until plan-3+ adds mapping.
    for (const recipe of collectRecipeNames(val)) {
      if (WEB_ONLY_RECIPES.has(recipe)) {
        warnings.push(
          `trigger '${t}' uses web-only recipe '${recipe}' — no visual effect on React Native until per-platform shadow/filter mapping is added`,
        );
      }
    }
  }

  if (activeTriggerCount >= HARD_TRIGGERS) {
    errors.push(
      `element has ${activeTriggerCount} triggers with animations — hard-cap (${HARD_TRIGGERS}) exceeded; remove non-essential triggers`,
    );
  } else if (activeTriggerCount >= SOFT_TRIGGERS) {
    warnings.push(
      `element has ${activeTriggerCount} triggers with animations — soft-cap (${SOFT_TRIGGERS}) reached; consider consolidating`,
    );
  }

  return { warnings, errors };
}

// --- Background caps (Task 9) ---------------------------------------------

/**
 * Input surface for validateBackgroundCaps. Deliberately narrower than the
 * full LayerBackground type — we only need counts and per-blob cap-relevant
 * fields. Callers pass the relevant slice of their background config.
 */
export interface BackgroundValidationInput {
  blobs?: readonly BlobInstance[];
  /**
   * Background layers. Only the length is examined; the `type` tag is kept
   * in the type to keep the input surface self-documenting (it's always a
   * LayerBackground.layers slice in practice).
   */
  layers?: ReadonlyArray<{ type: string }>;
}

const BG_CAPS = {
  blobsSoft: 8,
  blobsHard: 16,
  layersSoft: 6,
  layersHard: 10,
  customSvgPathSoft: 500,
  customSvgPathHard: 2000,
  motionDimsSoft: 2,
  motionDimsHard: 3,
} as const;

function countMotionDimensions(motion: BlobInstance['motion']): number {
  if (!motion) return 0;
  // Explicit field checks (not `Object.values(motion).filter(Boolean)`)
  // because the union admits only three keys — a literal check is both
  // exhaustive and survives schema evolution (missing a new key here would
  // need an intentional update, not silently undercount).
  let n = 0;
  if (motion.drift) n++;
  if (motion.rotate) n++;
  if (motion.scale) n++;
  return n;
}

/**
 * Validate a background-layer spec against per-layer and per-blob caps.
 *
 * Threshold semantics: strictly-over (`>` not `>=`). `blobsSoft=8` means
 * "up to 8 blobs is fine; 9+ warns"; `blobsHard=16` means "up to 16 is
 * tolerable; 17+ errors". See file-header note on why this differs from
 * validateAnimationCaps' `>=` convention.
 *
 * Motion-dimension hard cap (3) is effectively unreachable via a
 * well-typed BlobInstance.motion (which admits only 3 keys) — kept for
 * pattern symmetry and as a sentinel if a future dimension is added.
 */
export function validateBackgroundCaps(
  input: BackgroundValidationInput,
): AnimationValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const blobs = input.blobs ?? [];
  if (blobs.length > BG_CAPS.blobsHard) {
    errors.push(
      `blobs per background: ${blobs.length} exceeds hard-cap (${BG_CAPS.blobsHard}); split across multiple backgrounds or reduce count`,
    );
  } else if (blobs.length > BG_CAPS.blobsSoft) {
    warnings.push(
      `blobs per background: ${blobs.length} exceeds soft-cap (${BG_CAPS.blobsSoft}); review whether all are necessary`,
    );
  }

  const layers = input.layers ?? [];
  if (layers.length > BG_CAPS.layersHard) {
    errors.push(
      `layers per background: ${layers.length} exceeds hard-cap (${BG_CAPS.layersHard}); consolidate layers or split across backgrounds`,
    );
  } else if (layers.length > BG_CAPS.layersSoft) {
    warnings.push(
      `layers per background: ${layers.length} exceeds soft-cap (${BG_CAPS.layersSoft}); review whether all are necessary`,
    );
  }

  for (const blob of blobs) {
    // custom-svg path length — only meaningful when the path came from a
    // consumer. Curated shapes have their own catalog-sourced paths whose
    // length is controlled by the framework, not the spec author.
    if (blob.shape === 'custom-svg' && typeof blob.path === 'string') {
      const len = blob.path.length;
      if (len > BG_CAPS.customSvgPathHard) {
        errors.push(
          `custom-svg path length: ${len} chars exceeds hard-cap (${BG_CAPS.customSvgPathHard}); simplify the path geometry`,
        );
      } else if (len > BG_CAPS.customSvgPathSoft) {
        warnings.push(
          `custom-svg path length: ${len} chars exceeds soft-cap (${BG_CAPS.customSvgPathSoft}); consider simplifying the path`,
        );
      }
    }

    const dims = countMotionDimensions(blob.motion);
    // The hard-cap branch below is structurally unreachable via a
    // well-typed BlobMotion (only three keys exist, so `dims` maxes at 3,
    // equal to motionDimsHard; `>` requires strictly greater). Kept as a
    // sentinel: if a future contributor adds a fourth motion dimension,
    // bumping motionDimsHard here is the natural next step, and the
    // path activates immediately.
    /* c8 ignore next 4 — unreachable via well-typed input; sentinel branch */
    if (dims > BG_CAPS.motionDimsHard) {
      errors.push(
        `motion dimensions per blob: ${dims} exceeds hard-cap (${BG_CAPS.motionDimsHard}); remove non-essential motion`,
      );
    } else if (dims > BG_CAPS.motionDimsSoft) {
      warnings.push(
        `motion dimensions per blob: ${dims} exceeds soft-cap (${BG_CAPS.motionDimsSoft}); drift+rotate+scale together is visually heavy`,
      );
    }
  }

  return { warnings, errors };
}
