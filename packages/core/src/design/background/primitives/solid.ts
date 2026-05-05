import type { SolidLayerConfig, LayerSpec, LayerCommon } from '../../identity/types.js';

export function resolveCommon(config: { opacity?: number; blendMode?: string; zIndex?: number }, fallbackZIndex: number): LayerCommon {
  return {
    opacity: config.opacity ?? 1,
    blendMode: (config.blendMode as LayerCommon['blendMode']) ?? 'normal',
    zIndex: config.zIndex ?? fallbackZIndex,
  };
}

export function resolveSolid(config: SolidLayerConfig, index: number): LayerSpec {
  return {
    kind: 'solid',
    color: config.color,
    common: resolveCommon(config, index),
  };
}
