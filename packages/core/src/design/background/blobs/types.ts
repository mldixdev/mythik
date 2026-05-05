// Blob v2 — public type surface (plan 3 Task 6).
//
// Two configuration forms, mutually exclusive:
//   - preset form: BlobV2Config.preset + palette + motion preset — framework
//     picks positions/sizes/shapes from curated presets
//   - explicit form: BlobV2Config.blobs[] — consumer declares each blob
//
// Motion is expressed at the blob level via three independently composable
// dimensions (drift / rotate / scale). resolveBlobLayer (Task 7/8) converts
// these into `ElementAnimations.ambient` so Layer 3 `useShapeAnimations`
// consumes the same AnimationSpec contract as Layers 1-2 — single pipeline.
//
// Deliberate type-level relaxations (runtime-enforced by resolveBlobLayer):
//
//   - BlobV2Config allows { preset, blobs } ambiguous combination. Using a
//     discriminated union would be stricter, but JSON-origin specs (the
//     framework's primary input) don't gain much from stricter typing and
//     lose JSON ergonomics. resolveBlobLayer logs a dev-mode warning and
//     prefers `preset` when both are set.
//
//   - BlobInstance.path / viewBox are optional at the type level but
//     REQUIRED when shape === 'custom-svg'. A discriminated union would
//     enforce this, but the shape-as-discriminator pattern degrades
//     autocomplete ergonomics across the much-more-common curated-shape
//     path. resolveBlobLayer throws in dev when missing.

import type { ElementAnimations } from '../../animation/types.js';
import type { BlobShapeName, BlobShapeDef } from './catalog.js';

/** Curated preset compositions (shape + count + placement). */
export type BlobPreset = 'organic-duo' | 'organic-trio' | 'circle-pair';

/** Curated motion intensities (maps to drift duration + range). */
export type BlobMotionPreset =
  | 'drift-gentle'
  | 'drift-fluid'
  | 'drift-snappy'
  | 'static';

/**
 * Three independent motion dimensions per blob. Absent fields = no motion on
 * that dimension. All three can run in parallel (composed as an array of
 * ambient animations by the resolver).
 */
export interface BlobMotion {
  drift?: {
    duration: string;
    range: { x: number; y: number };
    easing?: string;
  };
  rotate?: {
    duration: string;
    from: string;
    to: string;
  };
  scale?: {
    duration: string;
    from: number;
    to: number;
  };
}

/** Explicit blob — consumer-declared shape + placement + styling + motion. */
export interface BlobInstance {
  shape: BlobShapeName;
  /** Required only when `shape === 'custom-svg'`. */
  path?: string;
  /** Required only when `shape === 'custom-svg'`. */
  viewBox?: string;
  position: { x: string; y: string };
  size: { width: string; height: string };
  rotation?: string;
  /**
   * Hex color string, or the palette keywords `'primary'` / `'accent'`.
   * `(string & {})` branding preserves autocomplete for the keywords.
   */
  color: 'primary' | 'accent' | (string & {});
  opacity?: number;
  blur?: number;
  motion?: BlobMotion;
}

/**
 * Top-level blob layer configuration.
 *
 * EITHER:
 *   - `preset` (+ optional palette/opacity/motion) — framework-generated
 *   - `blobs[]` — explicit list
 *
 * Providing both is malformed; resolveBlobLayer prefers `preset` and ignores
 * `blobs[]` when both are set (with a dev-mode warning).
 */
export interface BlobV2Config {
  preset?: BlobPreset;
  /**
   * Applied to `preset`-form blobs. Ignored in `blobs[]` form (each blob
   * declares its own color). The `(string & {})` branded intersection
   * preserves literal autocomplete for `'primary'` / `'accent'` while still
   * accepting arbitrary hex strings like `'#6366f1'`.
   */
  palette?: Array<'primary' | 'accent' | (string & {})>;
  /** Default opacity for preset-form blobs when individual blobs don't override. */
  opacity?: number;
  /** Default motion for preset-form blobs when individual blobs don't override. */
  motion?: BlobMotionPreset;
  /** Explicit-form override. Mutually exclusive with `preset`. */
  blobs?: BlobInstance[];
}

/** Renderer-ready style — all defaults applied, color resolved to hex. */
export interface BlobRenderStyle {
  position: { x: string; y: string };
  size: { width: string; height: string };
  rotation?: string;
  /** Resolved hex color (palette keywords already expanded). */
  color: string;
  /** 0..1 (defaulted to 1 when not specified). */
  opacity: number;
  /** px (defaulted to 0 when not specified). */
  blur: number;
}

/**
 * Output of resolveBlobLayer — paired shape def + render style + animations.
 * The `animations` field, when non-null, is a ready-to-consume ElementAnimations
 * with only the `ambient` trigger populated (plan 3 scope: blobs don't carry
 * mount/hover/etc.). Layer 3 `useShapeAnimations` consumes it directly.
 */
export interface BlobSpec {
  shape: BlobShapeDef;
  style: BlobRenderStyle;
  animations: ElementAnimations | null;
}
