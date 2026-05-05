import type { LayerConfig, LayerSpec } from '../identity/types.js';
import { resolveSolid, resolveGradient, resolveImage } from './primitives/index.js';
import { resolvePattern } from './patterns/index.js';
import { resolveGrain } from './grain.js';
import { resolveCommon } from './primitives/solid.js';

export function resolveLayer(config: LayerConfig, index: number): LayerSpec {
  switch (config.type) {
    case 'solid': return resolveSolid(config, index);
    case 'gradient': return resolveGradient(config, index);
    case 'pattern': return resolvePattern(config, index);
    case 'grain': return resolveGrain(config, index);
    case 'image': return resolveImage(config, index);
    case 'blobs':
      // Plan 3 Task 16. No palette resolution here — defer to BlobLayer (Task 18)
      // which has tokens in scope. The raw BlobsLayerConfig flows through
      // unchanged so the render boundary can call resolveBlobLayer.
      return { kind: 'blobs', config, common: resolveCommon(config, index) };
    default: {
      const exhaustive: never = config;
      throw new Error(`Unknown layer type: ${(exhaustive as { type: string }).type}`);
    }
  }
}
