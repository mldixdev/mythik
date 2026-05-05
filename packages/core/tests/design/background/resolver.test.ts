import { describe, it, expect } from 'vitest';
import { resolveBackgroundLayers } from '../../../src/design/background/resolver.js';
import type { LayerBackground } from '../../../src/design/identity/types.js';

describe('resolveBackgroundLayers', () => {
  it('returns empty array for undefined/empty background', () => {
    expect(resolveBackgroundLayers(undefined)).toEqual([]);
    expect(resolveBackgroundLayers({})).toEqual([]);
  });

  it('emits solid base color as first spec', () => {
    const bg: LayerBackground = { color: '#0a0a0a' };
    const specs = resolveBackgroundLayers(bg);
    expect(specs).toHaveLength(1);
    expect(specs[0].kind).toBe('solid');
    if (specs[0].kind === 'solid') expect(specs[0].color).toBe('#0a0a0a');
  });

  it('orders: base color first, then layers in order', () => {
    const bg: LayerBackground = {
      color: '#fff',
      layers: [
        { type: 'gradient', kind: 'linear', stops: [{ color: '#000', at: '0%' }, { color: '#fff', at: '100%' }] },
        { type: 'pattern', kind: 'grid', spacing: 40 },
        { type: 'grain', intensity: 0.04 },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs).toHaveLength(4);
    expect(specs[0].kind).toBe('solid');
    expect(specs[1].kind).toBe('gradient');
    expect(specs[2].kind).toBe('pattern');
    expect(specs[3].kind).toBe('grain');
  });

  it('assigns zIndex by array position when not explicit', () => {
    const bg: LayerBackground = {
      color: '#fff',
      layers: [
        { type: 'gradient', kind: 'linear', stops: [{ color: '#000', at: '0%' }, { color: '#fff', at: '100%' }] },
        { type: 'pattern', kind: 'grid', spacing: 40 },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs[0].common.zIndex).toBe(0);
    expect(specs[1].common.zIndex).toBe(1);
    expect(specs[2].common.zIndex).toBe(2);
  });

  it('respects explicit zIndex overrides', () => {
    const bg: LayerBackground = {
      layers: [
        { type: 'pattern', kind: 'grid', spacing: 40, zIndex: 10 },
        { type: 'solid', color: '#f00', zIndex: 5 },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs[0].common.zIndex).toBe(10);
    expect(specs[1].common.zIndex).toBe(5);
  });

  it('propagates blendMode and opacity to LayerCommon', () => {
    const bg: LayerBackground = {
      layers: [
        { type: 'solid', color: '#f00', blendMode: 'multiply', opacity: 0.7 },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs[0].common.blendMode).toBe('multiply');
    expect(specs[0].common.opacity).toBe(0.7);
  });

  // Plan 3 Task 16 — blob layer dispatch.
  // resolveLayer must accept `{ type: 'blobs', ... }` and emit a LayerSpec
  // with kind='blobs' that carries the raw BlobV2Config forward. Palette
  // resolution is deferred to the render boundary (BlobLayer, Task 18)
  // because resolveLayer has no access to tokens.
  it('resolveLayer dispatches blobs preset form and preserves config', () => {
    const bg: LayerBackground = {
      layers: [
        { type: 'blobs', preset: 'organic-duo', palette: ['primary', 'accent'], motion: 'drift-gentle' },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs).toHaveLength(1);
    expect(specs[0].kind).toBe('blobs');
    if (specs[0].kind === 'blobs') {
      expect(specs[0].config.preset).toBe('organic-duo');
      expect(specs[0].config.palette).toEqual(['primary', 'accent']);
      expect(specs[0].config.motion).toBe('drift-gentle');
    }
  });

  it('resolveLayer dispatches blobs explicit form and preserves blobs[]', () => {
    const bg: LayerBackground = {
      layers: [
        {
          type: 'blobs',
          blobs: [
            {
              shape: 'organic-1',
              position: { x: '10%', y: '20%' },
              size: { width: '420px', height: '360px' },
              color: 'primary',
            },
          ],
        },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs).toHaveLength(1);
    expect(specs[0].kind).toBe('blobs');
    if (specs[0].kind === 'blobs') {
      expect(specs[0].config.blobs).toHaveLength(1);
      expect(specs[0].config.blobs?.[0].shape).toBe('organic-1');
    }
  });

  it('blobs layer propagates LayerCommonProps (opacity/blendMode/zIndex) to common', () => {
    const bg: LayerBackground = {
      layers: [
        { type: 'blobs', preset: 'circle-pair', opacity: 0.6, blendMode: 'screen', zIndex: 5 },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs[0].common.opacity).toBe(0.6);
    expect(specs[0].common.blendMode).toBe('screen');
    expect(specs[0].common.zIndex).toBe(5);
  });

  // Plan 3 Task 16 review I1 — defaults path. Blob is the only LayerSpec
  // variant whose `common` is produced by a direct resolveCommon() call from
  // layers.ts (other kinds funnel through type-specific resolvers). Pin
  // default values so a future regression where the config or index isn't
  // threaded through is caught immediately.
  it('blobs layer defaults common to { opacity:1, blendMode:"normal", zIndex:index }', () => {
    const bg: LayerBackground = {
      layers: [
        { type: 'blobs', preset: 'organic-duo' },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs[0].common.opacity).toBe(1);
    expect(specs[0].common.blendMode).toBe('normal');
    expect(specs[0].common.zIndex).toBe(0);
  });

  // Plan 3 Task 16 review I2 — mixed-layer ordering. Pin that the zIndex
  // counter keeps incrementing through the blobs branch when blobs sit in
  // the middle of a multi-layer stack.
  it('blobs zIndex uses array position when mixed with other layer kinds', () => {
    const bg: LayerBackground = {
      layers: [
        { type: 'gradient', kind: 'linear', stops: [{ color: '#000', at: '0%' }, { color: '#fff', at: '100%' }] },
        { type: 'blobs', preset: 'organic-duo' },
        { type: 'grain', intensity: 0.04 },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs[0].kind).toBe('gradient');
    expect(specs[0].common.zIndex).toBe(0);
    expect(specs[1].kind).toBe('blobs');
    expect(specs[1].common.zIndex).toBe(1);
    expect(specs[2].kind).toBe('grain');
    expect(specs[2].common.zIndex).toBe(2);
  });
});
