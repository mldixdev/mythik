import { describe, it, expect } from 'vitest';
import { resolveBackgroundLayers, BACKGROUND_RECIPES } from '../../../src/index.js';
import type { LayerBackground } from '../../../src/design/identity/types.js';

describe('Background system — recipe parity snapshot', () => {
  it.each(Object.keys(BACKGROUND_RECIPES))('recipe %s resolves deterministically', (recipeName) => {
    const specs1 = resolveBackgroundLayers(BACKGROUND_RECIPES[recipeName]);
    const specs2 = resolveBackgroundLayers(BACKGROUND_RECIPES[recipeName]);
    expect(specs1.length).toBe(specs2.length);
    specs1.forEach((spec, i) => {
      expect(spec.kind).toBe(specs2[i].kind);
      expect(spec.common.opacity).toBe(specs2[i].common.opacity);
      expect(spec.common.zIndex).toBe(specs2[i].common.zIndex);
    });
  });

  it('all 8 recipes resolve to layer counts in [1, 5]', () => {
    for (const bg of Object.values(BACKGROUND_RECIPES)) {
      const specs = resolveBackgroundLayers(bg);
      expect(specs.length).toBeGreaterThanOrEqual(1);
      expect(specs.length).toBeLessThanOrEqual(5);
    }
  });

  it('diagonal-cross-grid stress test (user example 1) renders correctly', () => {
    const bg: LayerBackground = {
      color: '#ffffff',
      layers: [
        { type: 'pattern', kind: 'diagonal', angle: 45, thickness: 2, spacing: 40, color: '#e5e7eb', opacity: 1 },
        { type: 'pattern', kind: 'diagonal', angle: -45, thickness: 2, spacing: 40, color: '#e5e7eb', opacity: 1 },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs).toHaveLength(3);
    expect(specs[0].kind).toBe('solid');
    expect(specs[1].kind).toBe('pattern');
    expect(specs[2].kind).toBe('pattern');
    if (specs[1].kind === 'pattern') expect(specs[1].svg).toContain('rotate(45)');
    if (specs[2].kind === 'pattern') expect(specs[2].svg).toContain('rotate(-45)');
  });

  it('dual-gradient-overlay stress test (user example 2) renders correctly', () => {
    const bg: LayerBackground = {
      color: '#ffffff',
      layers: [
        { type: 'pattern', kind: 'grid', spacing: 48, thickness: 1, color: '#e5e7eb', opacity: 0.8 },
        {
          type: 'gradient',
          kind: 'radial',
          shape: 'circle',
          size: '500px',
          position: '0% 20%',
          stops: [
            { color: '#8b5cf6', opacity: 0.3, at: '0%' },
            { color: 'transparent', at: '100%' },
          ],
        },
        {
          type: 'gradient',
          kind: 'radial',
          shape: 'circle',
          size: '500px',
          position: '100% 0%',
          stops: [
            { color: '#3b82f6', opacity: 0.3, at: '0%' },
            { color: 'transparent', at: '100%' },
          ],
        },
      ],
    };
    const specs = resolveBackgroundLayers(bg);
    expect(specs).toHaveLength(4);
    expect(specs[0].kind).toBe('solid');
    expect(specs[1].kind).toBe('pattern');
    expect(specs[2].kind).toBe('gradient');
    expect(specs[3].kind).toBe('gradient');
    if (specs[2].kind === 'gradient') {
      expect(specs[2].css).toContain('circle 500px at 0% 20%');
    }
    if (specs[3].kind === 'gradient') {
      expect(specs[3].css).toContain('circle 500px at 100% 0%');
    }
  });
});
