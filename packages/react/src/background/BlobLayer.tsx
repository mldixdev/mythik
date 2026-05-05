// Plan 3 Task 18 — web BlobLayer.
//
// Consumes a BlobV2Config (explicit `blobs[]` or preset form) + a {primary,
// accent} palette and mounts one <svg><path/></svg> per resolved BlobSpec.
// Each path receives a ref that drives ambient motion through Layer 3's
// `useShapeAnimations` hook (drift/rotate/scale → CSS @keyframes registered
// once, dedup'd by recipe hash). Rendering is JSX-native — no
// dangerouslySetInnerHTML — so React handles all escaping and the legacy
// XSS surface (box.tsx:127 + resolveBlobStyles) is closed.
//
// Placement: this component emits a React fragment of positioned <svg>
// elements (absolute with per-blob left/top/width/height). The caller
// (BackgroundStack) provides the compositing wrapper div that applies
// LayerCommonProps opacity/blendMode/zIndex; BlobLayer only handles the
// blob-level styling.
//
// BlobV2Config.opacity (per-blob fill default) flows through resolveBlobLayer
// and lands on each BlobRenderStyle.opacity → the `opacity` attribute on the
// outer <svg>. Layer-container opacity lives separately on the caller's
// wrapper. See BlobsLayerConfig.blobOpacity docstring for the naming
// rationale at the layer-type surface.

import React, { useMemo, useRef } from 'react';
import {
  resolveBlobLayer,
  ANIMATION_RECIPES,
  type BlobV2Config,
  type BlobSpec,
} from 'mythik';
import { useShapeAnimations } from '../animation/useShapeAnimations.js';

interface BlobLayerProps {
  config: BlobV2Config;
  palette: { primary: string; accent: string };
}

export function BlobLayer({ config, palette }: BlobLayerProps): React.ReactElement {
  // Task 19 review I1 (fix applied to web for parity) — resolveBlobLayer
  // returns fresh BlobSpec references per call; each spec.animations drives a
  // useShapeAnimations useMemo. Without this memo, every parent render
  // cascades into an O(N) resolve across all blobs and keyframe re-register.
  const specs = useMemo(() => resolveBlobLayer(config, palette), [config, palette]);
  return (
    <>
      {specs.map((spec, i) => (
        <BlobSvg key={i} spec={spec} />
      ))}
    </>
  );
}

/**
 * Per-blob <svg> wrapping a single <path>. The ref binds useShapeAnimations
 * to the path element (ambient trigger only; see useShapeAnimations docstring
 * for the Layer 3 scope narrowing).
 *
 * Why the ref targets <path> not <svg>: the keyframes transform
 * (translate/rotate/scale) should apply to the shape geometry itself so
 * layered blur and outer positioning remain stable. If we animated the <svg>
 * root the wrapper div's position would shift under us, producing scroll-
 * equivalent artifacts.
 */
function BlobSvg({ spec }: { spec: BlobSpec }): React.ReactElement {
  const ref = useRef<SVGPathElement>(null);
  useShapeAnimations(ref, spec.animations, { recipes: ANIMATION_RECIPES });

  const { style, shape } = spec;

  return (
    <svg
      viewBox={shape.viewBox}
      style={{
        position: 'absolute',
        left: style.position.x,
        top: style.position.y,
        width: style.size.width,
        height: style.size.height,
        transform: style.rotation ? `rotate(${style.rotation})` : undefined,
        filter: style.blur > 0 ? `blur(${style.blur}px)` : undefined,
        pointerEvents: 'none',
      }}
      opacity={style.opacity}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path ref={ref} d={shape.path} fill={style.color} />
    </svg>
  );
}
