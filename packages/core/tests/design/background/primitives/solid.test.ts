import { describe, it, expect } from 'vitest';
import { resolveSolid } from '../../../../src/design/background/primitives/solid.js';
import type { SolidLayerConfig } from '../../../../src/design/identity/types.js';

describe('resolveSolid', () => {
  it('returns LayerSpec with color and default common props', () => {
    const config: SolidLayerConfig = { type: 'solid', color: '#0a0a0a' };
    const spec = resolveSolid(config, 0);

    expect(spec.kind).toBe('solid');
    if (spec.kind !== 'solid') throw new Error('expected solid');
    expect(spec.color).toBe('#0a0a0a');
    expect(spec.common.opacity).toBe(1);
    expect(spec.common.blendMode).toBe('normal');
    expect(spec.common.zIndex).toBe(0);
  });

  it('respects explicit opacity, blendMode, zIndex', () => {
    const config: SolidLayerConfig = {
      type: 'solid',
      color: '#ff0000',
      opacity: 0.5,
      blendMode: 'multiply',
      zIndex: 3,
    };
    const spec = resolveSolid(config, 99);
    if (spec.kind !== 'solid') throw new Error('expected solid');
    expect(spec.common.opacity).toBe(0.5);
    expect(spec.common.blendMode).toBe('multiply');
    expect(spec.common.zIndex).toBe(3);
  });

  it('uses index as zIndex when not specified', () => {
    const config: SolidLayerConfig = { type: 'solid', color: '#fff' };
    const spec = resolveSolid(config, 5);
    expect(spec.common.zIndex).toBe(5);
  });
});
