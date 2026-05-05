import type { LayerBackground, LayerSpec } from '../identity/types.js';
import { resolveSolid } from './primitives/solid.js';
import { resolveLayer } from './layers.js';

export function resolveBackgroundLayers(bg: LayerBackground | undefined): LayerSpec[] {
  if (!bg || (!bg.color && !bg.layers?.length)) return [];

  const specs: LayerSpec[] = [];
  let index = 0;

  if (bg.color) {
    specs.push(resolveSolid({ type: 'solid', color: bg.color }, index));
    index += 1;
  }

  if (bg.layers) {
    for (const layer of bg.layers) {
      specs.push(resolveLayer(layer, index));
      index += 1;
    }
  }

  return specs;
}
