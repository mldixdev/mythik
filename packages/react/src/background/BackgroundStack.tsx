import React from 'react';
import { resolveBackgroundLayers, BACKGROUND_RECIPES } from 'mythik';
import type { LayerBackground, LayerSpec, BlobV2Config } from 'mythik';
import { BackgroundLayer } from './BackgroundLayer.js';
import { BlobLayer } from './BlobLayer.js';

interface BackgroundStackProps {
  background?: LayerBackground | string;
  /**
   * Palette source for blob layers (plan 3 Task 18). Without it, blob layers
   * fall through to the BackgroundLayer stub which renders an empty
   * positioned div (layer geometry stays consistent; no shapes paint). A dev-
   * mode warning fires per render so Task 20 misuse (forgetting to thread
   * tokens) doesn't fail silently. MythikRenderer populates this from
   * resolved tokens in Task 20.
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
 * entirely and mount <BlobLayer>; everything else (including blobs without a
 * palette) goes through the generic BackgroundLayer path. The blob branch also
 * maps BlobsLayerConfig.blobOpacity → BlobV2Config.opacity (the per-blob fill
 * default) and strips layer-level fields (type/opacity/blendMode/zIndex) that
 * don't belong inside resolveBlobLayer.
 */
function renderLayer(
  spec: LayerSpec,
  i: number,
  palette: BackgroundStackProps['palette'],
): React.ReactElement {
  if (spec.kind === 'blobs' && !palette && process.env.NODE_ENV !== 'production') {
    // Review M3 — surface the fallback so Task 20 misuse (forgetting to
    // thread tokens through MythikRenderer) doesn't fail silently with an
    // invisible blob layer. Only the preview/test harness legitimately hits
    // this path without tokens; warn once per render.
    // eslint-disable-next-line no-console
    console.warn(
      'BackgroundStack (web): blobs layer rendered without palette — falling back to empty stub. Pass the `palette` prop (typically `{ primary, accent }` from resolved tokens) to enable blob rendering.',
    );
  }
  if (spec.kind === 'blobs' && palette) {
    return (
      <div
        key={`bg-layer-${i}`}
        data-sv-layer="blobs"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: spec.common.opacity,
          mixBlendMode: spec.common.blendMode === 'normal' ? undefined : spec.common.blendMode,
          zIndex: spec.common.zIndex,
          pointerEvents: 'none',
        }}
      >
        <BlobLayer config={toBlobV2Config(spec.config)} palette={palette} />
      </div>
    );
  }
  return <BackgroundLayer key={`bg-layer-${i}`} spec={spec} />;
}

/**
 * Strip layer-level fields from BlobsLayerConfig and promote `blobOpacity` to
 * the BlobV2Config.opacity slot that resolveBlobLayer consumes. Keeps the two
 * opacity axes (layer-container vs per-blob fill) cleanly separated at the
 * type boundary — see BlobsLayerConfig docstring.
 */
function toBlobV2Config(
  layerConfig: Extract<LayerSpec, { kind: 'blobs' }>['config'],
): BlobV2Config {
  const { type: _type, opacity: _layerOpacity, blendMode: _blendMode, zIndex: _zIndex, blobOpacity, ...rest } = layerConfig;
  void _type; void _layerOpacity; void _blendMode; void _zIndex;
  return blobOpacity !== undefined ? { ...rest, opacity: blobOpacity } : rest;
}
