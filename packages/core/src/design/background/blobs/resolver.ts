// Blob v2 — resolver (plan 3 Task 7 + 8).
//
// Pure function that converts a BlobV2Config into an array of BlobSpec ready
// to render. Two input forms:
//
//   1. Explicit form (BlobV2Config.blobs[]): consumer declares each blob. The
//      resolver applies defaults (opacity 1, blur 0), resolves palette
//      keywords, looks up catalog shapes, and converts motion dimensions
//      into ElementAnimations.ambient entries (Task 8).
//
//   2. Preset form (BlobV2Config.preset + palette + motion preset): framework
//      picks the shape/position/size composition from a small curated
//      registry. Motion preset identifiers ('drift-gentle'/'drift-fluid'/
//      'drift-snappy'/'static') map to concrete BlobMotion values applied
//      uniformly to every blob in the preset (Task 8).
//
// Ambiguous combinations ({ preset, blobs } both set): resolver prefers
// `preset` and logs a dev warning. Documented in types.ts.
//
// Motion → ElementAnimations.ambient conversion (Task 8):
//   Each of the three independent motion dimensions (drift / rotate / scale)
//   becomes one InlineAnimation:
//     - drift:  keyframes [0%/50%/100%] on translateX/Y; returns to origin via
//               `direction: alternate` — symmetric (no visible snap-back).
//     - rotate: keyframes [0%/100%] on rotate; alternate to avoid spinning.
//     - scale:  keyframes [0%/100%] on scale;  alternate to breathe.
//   All three use `iterations: 'infinite'` because blob motion is ambient
//   (cosmetic, non-interactive, always on). When multiple dimensions are set
//   we emit them as an array so the Layer 3 runner composes each on its own
//   timeline. Single-dimension motion returns a scalar for ergonomics — the
//   `AnimationRef | AnimationRef[]` union accepts both.
//
// Error policy (matches design spec "Error handling" table):
//
//   - `shape: 'custom-svg'` requires both `path` and `viewBox`. Dev: throws
//     with field-specific message to surface the bug immediately. Prod:
//     skips the malformed blob + console.warn — preserves app stability.
//     Rationale: specs in prod come from the DB (should have passed
//     validation); a crash would take the whole app down over one bad blob.
//
//   - Ambiguous { preset, blobs } both set: dev-only console.warn (no
//     throw). Severity is lower than the custom-svg case because there's a
//     defensible winner (preset), and no rendering is broken — just one
//     of the two inputs is ignored. Contrast with useElementAnimations'
//     mixed-key throw (Task 4): there, no defensible winner exists since
//     trigger keys and context keys both carry meaning.
//
//   - Everything else is permissive: missing palette entries, out-of-range
//     opacities, etc. are passed through unmodified; validator (Task 9)
//     catches caps.

import { BLOB_CATALOG, type BlobShapeDef, type BlobShapeName } from './catalog.js';
import type {
  BlobInstance,
  BlobMotion,
  BlobMotionPreset,
  BlobPreset,
  BlobRenderStyle,
  BlobSpec,
  BlobV2Config,
} from './types.js';
import type {
  AnimationRef,
  ElementAnimations,
  InlineAnimation,
} from '../../animation/types.js';

const IS_DEV = process.env.NODE_ENV !== 'production';

interface Palette {
  primary: string;
  accent: string;
}

function resolveColor(color: string, palette: Palette): string {
  if (color === 'primary') return palette.primary;
  if (color === 'accent') return palette.accent;
  return color;
}

/**
 * Resolve a blob instance's shape to a complete BlobShapeDef.
 *
 * @returns BlobShapeDef on success.
 * @returns null when the instance is malformed (custom-svg missing path or
 *          viewBox) in production — caller should skip this blob. In dev,
 *          throws instead to surface the malformation immediately.
 */
function resolveShape(instance: BlobInstance): BlobShapeDef | null {
  if (instance.shape === 'custom-svg') {
    if (!instance.path) {
      const msg =
        `resolveBlobLayer: shape='custom-svg' requires a non-empty path. ` +
        `Got path=${JSON.stringify(instance.path)}.`;
      if (IS_DEV) throw new Error(msg);
      // eslint-disable-next-line no-console
      console.warn(msg);
      return null;
    }
    if (!instance.viewBox) {
      const msg =
        `resolveBlobLayer: shape='custom-svg' requires a non-empty viewBox. ` +
        `Got viewBox=${JSON.stringify(instance.viewBox)}.`;
      if (IS_DEV) throw new Error(msg);
      // eslint-disable-next-line no-console
      console.warn(msg);
      return null;
    }
    return {
      name: 'custom-svg',
      path: instance.path,
      viewBox: instance.viewBox,
    };
  }
  // Curated shape — catalog lookup is total over BlobShapeName minus
  // 'custom-svg'. TS narrows `instance.shape` here.
  return BLOB_CATALOG[instance.shape];
}

function resolveStyle(
  instance: BlobInstance,
  palette: Palette,
): BlobRenderStyle {
  return {
    position: instance.position,
    size: instance.size,
    rotation: instance.rotation,
    color: resolveColor(instance.color, palette),
    // `??` preserves explicit 0 (not treated as missing); 1 default matches
    // "fully opaque" intuition. `?? 0` for blur aligns with "no blur by default".
    opacity: instance.opacity ?? 1,
    blur: instance.blur ?? 0,
  };
}

// --- Motion → ElementAnimations.ambient conversion ------------------------
//
// Each dimension produces one InlineAnimation. All three use
// `direction: 'alternate'` for contract uniformity, but the effect differs:
//
//   - drift: keyframes are already symmetric (0%→origin, 50%→max, 100%→origin).
//     `alternate` reverses odd iterations; reversing a symmetric curve gives
//     the same trajectory, so it's a no-op for drift *trajectory*. Kept for
//     uniform contract across dimensions and to match the plan 2 reduced-
//     motion semantics ("disable entirely" is the only binary switch needed).
//
//   - rotate + scale: 2-point keyframes (from → to). Without `alternate`,
//     iteration 2 would snap back to `from` and jump to `to` again — visible
//     flicker. `alternate` plays iteration 2 as `to → from` reversed, giving
//     a smooth breathing/oscillation cycle.
//
// Perceived cycle duration:
//   - drift: 1 × `duration` (full symmetric out-and-back in one iteration).
//   - rotate/scale: 2 × `duration` (iteration 1 forward + iteration 2 reverse
//     completes the visible cycle).
//
// This asymmetry is intentional: `duration` names "the time the animation's
// own keyframe timeline takes", not "the visual cycle length". Consumers who
// want comparable cadence across dimensions should halve rotate/scale
// durations relative to drift.

function driftToInline(d: NonNullable<BlobMotion['drift']>): InlineAnimation {
  return {
    keyframes: [
      { at: '0%', transform: { translateX: 0, translateY: 0 } },
      { at: '50%', transform: { translateX: d.range.x, translateY: d.range.y } },
      { at: '100%', transform: { translateX: 0, translateY: 0 } },
    ],
    duration: d.duration,
    easing: d.easing ?? 'ease-in-out',
    iterations: 'infinite',
    direction: 'alternate',
  };
}

function rotateToInline(r: NonNullable<BlobMotion['rotate']>): InlineAnimation {
  return {
    keyframes: [
      { at: '0%', transform: { rotate: r.from } },
      { at: '100%', transform: { rotate: r.to } },
    ],
    duration: r.duration,
    easing: 'linear',
    iterations: 'infinite',
    direction: 'alternate',
  };
}

function scaleToInline(s: NonNullable<BlobMotion['scale']>): InlineAnimation {
  return {
    keyframes: [
      { at: '0%', transform: { scale: s.from } },
      { at: '100%', transform: { scale: s.to } },
    ],
    duration: s.duration,
    easing: 'ease-in-out',
    iterations: 'infinite',
    direction: 'alternate',
  };
}

/**
 * Convert a BlobMotion (or undefined) to ElementAnimations with only the
 * `ambient` trigger populated. Returns null when there is no motion to emit
 * so the caller can set `BlobSpec.animations = null` directly.
 *
 * Emission order is stable: drift → rotate → scale. Single-dimension motion
 * returns a scalar `AnimationRef` (not a 1-element array) — `AnimationRef |
 * AnimationRef[]` accepts both, and scalar is the more ergonomic default.
 */
function motionToAnimations(
  motion: BlobMotion | undefined,
): ElementAnimations | null {
  if (!motion) return null;
  const entries: AnimationRef[] = [];
  if (motion.drift) entries.push(driftToInline(motion.drift));
  if (motion.rotate) entries.push(rotateToInline(motion.rotate));
  if (motion.scale) entries.push(scaleToInline(motion.scale));
  if (entries.length === 0) return null;
  return { ambient: entries.length === 1 ? entries[0] : entries };
}

// --- Preset form ---------------------------------------------------------
//
// Curated compositions — consumer picks a preset identifier and the framework
// hydrates the shape/position/size triple for each blob. Palette keywords
// rotate over the `palette` array (modulo the number of blobs); `opacity` is
// applied uniformly.

/**
 * Seed fields for each blob in a preset composition. The palette keyword is
 * NOT baked in here — it's threaded through at resolution time so the same
 * preset can render any palette combination.
 *
 * The `shape` field excludes `'custom-svg'` at the type level: presets are
 * curated compositions and cannot include the consumer-authored sentinel
 * shape (which needs path + viewBox). Narrowing at the source instead of
 * casting at the use site means a future contributor who tries to add
 * `{ shape: 'custom-svg', ... }` to PRESET_SEEDS sees a compile error
 * immediately — rather than an untraceable runtime `undefined` from the
 * catalog lookup.
 */
type PresetSeed = Pick<BlobInstance, 'position' | 'size' | 'rotation'> & {
  shape: Exclude<BlobShapeName, 'custom-svg'>;
};

const PRESET_SEEDS: Record<BlobPreset, readonly PresetSeed[]> = {
  'organic-duo': [
    { shape: 'organic-1', position: { x: '10%', y: '20%' }, size: { width: '420px', height: '360px' } },
    { shape: 'organic-3', position: { x: '60%', y: '55%' }, size: { width: '380px', height: '320px' } },
  ],
  'organic-trio': [
    { shape: 'organic-1', position: { x: '5%', y: '15%' }, size: { width: '400px', height: '340px' } },
    { shape: 'organic-4', position: { x: '55%', y: '40%' }, size: { width: '360px', height: '300px' } },
    { shape: 'organic-5', position: { x: '30%', y: '70%' }, size: { width: '340px', height: '280px' } },
  ],
  'circle-pair': [
    { shape: 'circle', position: { x: '15%', y: '25%' }, size: { width: '320px', height: '320px' } },
    { shape: 'circle', position: { x: '65%', y: '60%' }, size: { width: '280px', height: '280px' } },
  ],
};

// Motion presets — curated triples of (duration, range, easing). Design
// intent per preset:
//   - drift-gentle: slow, small amplitude, default ease-in-out (organic feel).
//     Ambient background, does not pull attention.
//   - drift-fluid:  medium-fast, wider amplitude, default ease-in-out.
//     Lively but still organic (Stripe/Linear aesthetic).
//   - drift-snappy: fast, medium amplitude, `linear` easing (mechanical/
//     constant-velocity feel). Contrasts the gentle/fluid organic curves.
// drift-gentle and drift-fluid deliberately omit `easing` to inherit the
// ease-in-out default; drift-snappy overrides with linear.
const PRESET_MOTION: Record<Exclude<BlobMotionPreset, 'static'>, BlobMotion> = {
  'drift-gentle': { drift: { duration: '28s', range: { x: 4, y: 3 } } },
  'drift-fluid': { drift: { duration: '20s', range: { x: 8, y: 5 } } },
  'drift-snappy': { drift: { duration: '14s', range: { x: 6, y: 4 }, easing: 'linear' } },
};

function resolvePresetMotion(
  preset: BlobMotionPreset | undefined,
): BlobMotion | undefined {
  if (!preset || preset === 'static') return undefined;
  return PRESET_MOTION[preset];
}

/**
 * Convert a BlobV2Config into an array of render-ready BlobSpec entries.
 *
 * Ordering: explicit-form blobs are emitted in the same order as the input
 * array. Preset-form blobs are emitted in preset-defined order (Task 8).
 *
 * Ambiguous inputs ({ preset, blobs } both set): preset wins, dev warning.
 */
export function resolveBlobLayer(
  config: BlobV2Config,
  palette: Palette,
): BlobSpec[] {
  // Preset form takes precedence when both are set. Dev warns on ambiguity.
  if (config.preset !== undefined) {
    if (
      IS_DEV &&
      config.blobs !== undefined &&
      config.blobs.length > 0
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        "resolveBlobLayer: both 'preset' and 'blobs' are set; preset takes precedence and blobs are ignored. " +
          'Remove one to silence this warning.',
      );
    }

    const seeds = PRESET_SEEDS[config.preset];
    const paletteNames = config.palette ?? ['primary'];
    // Defensive: `paletteNames` is typed non-empty in spirit but a consumer
    // could pass an empty array at runtime — fall back to ['primary'] so
    // modulo arithmetic below stays sound (n % 0 = NaN). Dev-warn because
    // `palette: []` is almost always a bug (consumer meant to omit the
    // field entirely); silent fallback would hide it. Severity matches the
    // existing ambiguous {preset,blobs} dev-warn above — defensible winner,
    // no rendering broken.
    if (IS_DEV && paletteNames.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "resolveBlobLayer: preset 'palette' is an empty array; falling back to ['primary']. " +
          'Omit the field or pass at least one palette keyword to silence.',
      );
    }
    const safePaletteNames = paletteNames.length > 0 ? paletteNames : ['primary'];
    const motion = resolvePresetMotion(config.motion);
    const animations = motionToAnimations(motion);

    return seeds.map((seed, i) => {
      const colorName = safePaletteNames[i % safePaletteNames.length];
      const instance: BlobInstance = {
        ...seed,
        color: colorName,
        opacity: config.opacity,
      };
      // Preset seeds are curated — PresetSeed's shape type excludes
      // 'custom-svg' so catalog lookup is total. Going direct avoids the
      // `BlobShapeDef | null` union of resolveShape (which is needed only
      // for the explicit `blobs[]` path where custom-svg is allowed).
      const shape = BLOB_CATALOG[seed.shape];
      return {
        shape,
        style: resolveStyle(instance, palette),
        animations,
      };
    });
  }

  // Explicit form
  if (!config.blobs || config.blobs.length === 0) {
    return [];
  }

  const specs: BlobSpec[] = [];
  for (const instance of config.blobs) {
    const shape = resolveShape(instance);
    if (shape === null) continue; // prod-mode skip for malformed custom-svg
    specs.push({
      shape,
      style: resolveStyle(instance, palette),
      animations: motionToAnimations(instance.motion),
    });
  }
  return specs;
}
