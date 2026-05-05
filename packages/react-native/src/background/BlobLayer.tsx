// Plan 3 Task 19 — RN BlobLayer.
//
// Parity with the web sibling (packages/react/src/background/BlobLayer.tsx)
// with three platform-specific differences:
//
//   1. SVG runtime: react-native-svg instead of native browser SVG.
//      react-native-svg v13+ auto-translates RN's transform-array shape into
//      SVG transform strings on the native side (see useShapeAnimations RN
//      docstring for the version dependency).
//
//   2. Animation runtime: Reanimated's `useAnimatedProps` returns an object
//      the consumer spreads onto `Animated.createAnimatedComponent(Path)`.
//      No ref threading required — the animated-props channel replaces the
//      imperative el.style.animation write that the web runner uses.
//
//   3. Opacity surface: RN's View/Svg treats `opacity` as a style prop, not
//      an attribute. The Svg-level opacity lives in `style.opacity` rather
//      than via the `opacity` attribute on the web SVG root.
//
// Everything else — prop surface (`{ config, palette }`), blob resolution via
// resolveBlobLayer, ambient-motion pipeline through Layer 3 — is identical.

import React, { useMemo } from 'react';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import {
  resolveBlobLayer,
  ANIMATION_RECIPES,
  type BlobV2Config,
  type BlobSpec,
} from 'mythik';
import { useShapeAnimations } from '../animation/useShapeAnimations.js';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const IS_DEV = process.env.NODE_ENV !== 'production';

interface BlobLayerProps {
  config: BlobV2Config;
  palette: { primary: string; accent: string };
}

export function BlobLayer({ config, palette }: BlobLayerProps): React.ReactElement {
  // Task 19 review I1 — resolveBlobLayer returns fresh BlobSpec references on
  // every call, and each spec's `animations` drives a useShapeAnimations
  // useMemo. Without this memo, every parent render cascades into an O(N)
  // resolve + worklet-setup across all blobs. Web sibling shares the fix.
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
 * Per-blob Svg wrapping one animated Path. Ambient motion flows through
 * `animatedProps` spread onto AnimatedPath — Reanimated updates those props
 * on the UI thread, same shape as the web runner's CSS animation string.
 *
 * Why the animation drives Path props not Svg props: keyframe transforms
 * apply to shape geometry in the viewBox coordinate system, leaving the Svg
 * wrapper's absolute positioning stable. Mirrors the web rationale
 * (BlobLayer.tsx:48-58 over there) — animating the outer container would
 * produce visible positional drift under translate motion.
 */
function BlobSvg({ spec }: { spec: BlobSpec }): React.ReactElement {
  const { animatedProps } = useShapeAnimations(spec.animations, { recipes: ANIMATION_RECIPES });
  const { style, shape } = spec;

  // Task 19 review C2 — blur not supported on RN until plan 4 (RN shadow/
  // filter parity milestone). Surface the gap so consumers aren't confused by
  // cross-platform visual drift. One-shot warn per render with blur>0; omit
  // when blur is 0 (default for preset form + most explicit blobs).
  if (IS_DEV && style.blur > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `BlobLayer (RN): blob.blur=${style.blur} not rendered — RN filter parity lands in plan 4 milestone. Web renders blur as CSS filter:blur(); RN currently shows an unblurred blob.`,
    );
  }

  return (
    <Svg
      viewBox={shape.viewBox}
      // Task 19 review C1 — pointerEvents="none" on both wrapper View (in
      // BackgroundStack) AND Svg so blobs never capture touches. react-native-
      // svg honors pointerEvents as a prop (not a style key).
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: style.position.x,
        top: style.position.y,
        width: style.size.width,
        height: style.size.height,
        // RN treats opacity as a style prop; no separate attribute like web.
        opacity: style.opacity,
        // static rotation composes with animated rotation (rotate motion) by
        // layering the animated transform on the Path inside.
        transform: style.rotation ? [{ rotate: style.rotation }] : undefined,
      }}
      // Decorative only — accessibilityLabel absent + aria-hidden via testID
      // semantics. react-native-svg honors `accessible={false}` for AT skip.
      accessible={false}
    >
      <AnimatedPath
        d={shape.path}
        fill={style.color}
        // Cast is necessary because useAnimatedProps returns
        // `Record<string, unknown>` while AnimatedPath's animatedProps slot is
        // Reanimated's strict `AnimatedProps<PathProps>` mapped type. The two
        // are structurally compatible at runtime — the cast elides the
        // mapped-type construction the mock doesn't model.
        animatedProps={animatedProps as never}
      />
    </Svg>
  );
}
