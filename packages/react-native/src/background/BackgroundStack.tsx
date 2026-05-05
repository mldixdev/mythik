import React from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { resolveBackgroundLayers, BACKGROUND_RECIPES } from 'mythik';
import type { LayerBackground, LayerSpec, BlobV2Config } from 'mythik';
import { BackgroundLayer } from './BackgroundLayer.js';
import { BlobLayer } from './BlobLayer.js';

interface BackgroundStackProps {
  background?: LayerBackground | string;
  /**
   * Palette source for blob layers (plan 3 Task 19 — RN parity with Task 18
   * web). Without it, blob layers fall through to the BackgroundLayer stub
   * which renders an empty positioned View. A dev-mode warning fires per
   * render so Task 20 misuse doesn't fail silently. MythikRenderer
   * populates this from resolved tokens in Task 20.
   */
  palette?: { primary: string; accent: string };
}

export function BackgroundStack({ background, palette }: BackgroundStackProps) {
  if (!background) return null;

  const config: LayerBackground | undefined =
    typeof background === 'string' ? BACKGROUND_RECIPES[background] : background;

  if (!config) return null;

  const specs = resolveBackgroundLayers(config);
  if (!specs.length) return null;

  return (
    <>
      {specs.map((spec, i) => renderLayer(spec, i, palette))}
    </>
  );
}

/**
 * Dispatch layer rendering: blob layers with a palette bypass BackgroundLayer
 * and mount <BlobLayer> wrapped in a View that applies the compositing
 * LayerCommonProps (opacity, zIndex — RN has no mixBlendMode equivalent).
 * Everything else (including blobs without a palette) routes to BackgroundLayer.
 */
function renderLayer(
  spec: LayerSpec,
  i: number,
  palette: BackgroundStackProps['palette'],
): React.ReactElement {
  if (spec.kind === 'blobs' && !palette && process.env.NODE_ENV !== 'production') {
    // Mirror web dev-warn so Task 20 misuse (forgetting to thread tokens) is
    // surfaced on both platforms.
    // eslint-disable-next-line no-console
    console.warn(
      'BackgroundStack (RN): blobs layer rendered without palette — falling back to empty stub. Pass the `palette` prop (typically `{ primary, accent }` from resolved tokens) to enable blob rendering.',
    );
  }
  if (spec.kind === 'blobs' && palette) {
    // Task 19 review I2 — RN has no mixBlendMode equivalent on View. Dev-warn
    // when a spec requests a non-normal blendMode so cross-platform visual
    // drift is surfaced instead of silently dropped.
    if (process.env.NODE_ENV !== 'production' && spec.common.blendMode !== 'normal') {
      // eslint-disable-next-line no-console
      console.warn(
        `BackgroundStack (RN): blendMode="${spec.common.blendMode}" not supported on RN — blob layer will render without blend. Web applies mixBlendMode; RN parity for compositing lands in a future milestone.`,
      );
    }
    const wrapperStyle: ViewStyle = {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      opacity: spec.common.opacity,
      zIndex: spec.common.zIndex,
    };
    return (
      // Task 19 review C1 — pointerEvents="none" so the decorative blob layer
      // doesn't capture touches on anything rendered behind it. RN's
      // pointerEvents is a View prop (not a style key); matches Svg-level
      // pointerEvents in BlobLayer so both layers pass touches through.
      <View key={`bg-layer-${i}`} testID="sv-layer-blobs" style={wrapperStyle} pointerEvents="none">
        <BlobLayer config={toBlobV2Config(spec.config)} palette={palette} />
      </View>
    );
  }
  return <BackgroundLayer key={`bg-layer-${i}`} spec={spec} />;
}

/**
 * Strip layer-level fields from BlobsLayerConfig and promote `blobOpacity` to
 * the BlobV2Config.opacity slot that resolveBlobLayer consumes. Mirrors the
 * web sibling's helper — identical signature, identical semantics.
 */
function toBlobV2Config(
  layerConfig: Extract<LayerSpec, { kind: 'blobs' }>['config'],
): BlobV2Config {
  const { type: _type, opacity: _layerOpacity, blendMode: _blendMode, zIndex: _zIndex, blobOpacity, ...rest } = layerConfig;
  void _type; void _layerOpacity; void _blendMode; void _zIndex;
  return blobOpacity !== undefined ? { ...rest, opacity: blobOpacity } : rest;
}
