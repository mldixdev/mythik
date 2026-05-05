import { describe, it, expect } from 'vitest';
import type {
  LayerBackground,
  SolidLayerConfig,
  GradientLayerConfig,
  PatternLayerConfig,
  GrainLayerConfig,
  ImageLayerConfig,
  LayerSpec,
  GradientStop,
  BlendMode,
} from '../../../src/design/identity/types.js';

describe('Background types', () => {
  it('LayerBackground accepts color + layers', () => {
    const bg: LayerBackground = {
      color: '#0a0a0a',
      layers: [{ type: 'solid', color: '#ffffff' }],
    };
    expect(bg.color).toBe('#0a0a0a');
    expect(bg.layers?.length).toBe(1);
  });

  it('GradientLayerConfig requires stops', () => {
    const gradient: GradientLayerConfig = {
      type: 'gradient',
      kind: 'linear',
      angle: 135,
      stops: [
        { color: '#fff', at: '0%' },
        { color: '#000', at: '100%' },
      ],
    };
    expect(gradient.stops.length).toBe(2);
  });

  it('PatternLayerConfig kind enum accepts all 7 variants', () => {
    const kinds: PatternLayerConfig['kind'][] = [
      'grid', 'dots', 'diagonal', 'iso', 'crosshatch', 'chevron', 'custom-svg'
    ];
    expect(kinds.length).toBe(7);
  });

  it('BlendMode accepts all 8 values', () => {
    const modes: BlendMode[] = [
      'normal', 'multiply', 'screen', 'overlay',
      'soft-light', 'hard-light', 'color-dodge', 'color-burn'
    ];
    expect(modes.length).toBe(8);
  });
});
