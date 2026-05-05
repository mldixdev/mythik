import type { ImageLayerConfig, LayerSpec } from '../../identity/types.js';
import { resolveCommon } from './solid.js';

export function resolveImage(config: ImageLayerConfig, index: number): LayerSpec {
  return {
    kind: 'image',
    url: config.url,
    size: config.size ?? 'cover',
    position: config.position ?? 'center',
    repeat: config.repeat ?? 'no-repeat',
    common: resolveCommon(config, index),
  };
}
