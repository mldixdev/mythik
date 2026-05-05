import type { GrainLayerConfig, LayerSpec } from '../identity/types.js';
import { resolveCommon } from './primitives/solid.js';

let grainCounter = 0;

export function resolveGrain(config: GrainLayerConfig, index: number): LayerSpec {
  const intensity = config.intensity ?? 0.05;
  const scale = config.scale ?? 0.9;
  const monochrome = config.monochrome ?? true;

  grainCounter += 1;
  const id = `grain-filter-${grainCounter}`;

  const monoFilter = monochrome
    ? `<feColorMatrix type="saturate" values="0"/>`
    : '';

  const svg = `<filter id="${id}">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${scale}" numOctaves="1" stitchTiles="stitch"/>` +
    monoFilter +
    `</filter>` +
    `<rect width="100%" height="100%" filter="url(#${id})" opacity="${intensity}"/>`;

  return {
    kind: 'grain',
    svg,
    common: resolveCommon(config, index),
  };
}
