import { describe, it, expect } from 'vitest';
import { resolveGradient } from '../../../../src/design/background/primitives/gradient.js';
import type { GradientLayerConfig } from '../../../../src/design/identity/types.js';

describe('resolveGradient', () => {
  it('emits linear gradient with custom angle and stops', () => {
    const config: GradientLayerConfig = {
      type: 'gradient',
      kind: 'linear',
      angle: 135,
      stops: [
        { color: '#8b5cf6', opacity: 0.3, at: '0%' },
        { color: 'transparent', at: '100%' },
      ],
    };
    const spec = resolveGradient(config, 0);
    if (spec.kind !== 'gradient') throw new Error('expected gradient');
    expect(spec.css).toContain('linear-gradient');
    expect(spec.css).toContain('135deg');
    expect(spec.css).toMatch(/rgba\(139,\s*92,\s*246,\s*0\.3\)/);
    expect(spec.css).toContain('0%');
    expect(spec.css).toContain('100%');
    expect(spec.svg.def).toContain('<linearGradient');
  });

  it('emits radial gradient with shape + size + position', () => {
    const config: GradientLayerConfig = {
      type: 'gradient',
      kind: 'radial',
      shape: 'circle',
      size: '500px',
      position: '0% 20%',
      stops: [
        { color: '#3b82f6', opacity: 0.3, at: '0%' },
        { color: 'transparent', at: '100%' },
      ],
    };
    const spec = resolveGradient(config, 1);
    if (spec.kind !== 'gradient') throw new Error('expected gradient');
    expect(spec.css).toContain('radial-gradient(circle 500px at 0% 20%');
    expect(spec.svg.def).toContain('<radialGradient');
  });

  it('emits conic gradient with angle', () => {
    const config: GradientLayerConfig = {
      type: 'gradient',
      kind: 'conic',
      angle: 45,
      stops: [
        { color: '#ff0000', at: '0%' },
        { color: '#0000ff', at: '100%' },
      ],
    };
    const spec = resolveGradient(config, 2);
    if (spec.kind !== 'gradient') throw new Error('expected gradient');
    expect(spec.css).toContain('conic-gradient(from 45deg');
  });

  it('defaults linear angle to 180 (top-to-bottom) if unspecified', () => {
    const config: GradientLayerConfig = {
      type: 'gradient',
      kind: 'linear',
      stops: [
        { color: '#fff', at: '0%' },
        { color: '#000', at: '100%' },
      ],
    };
    const spec = resolveGradient(config, 0);
    if (spec.kind !== 'gradient') throw new Error('expected gradient');
    expect(spec.css).toContain('180deg');
  });

  it('applies opacity to color via rgba conversion', () => {
    const config: GradientLayerConfig = {
      type: 'gradient',
      kind: 'linear',
      stops: [
        { color: '#ff0000', opacity: 0.5, at: '0%' },
        { color: '#00ff00', at: '100%' },
      ],
    };
    const spec = resolveGradient(config, 0);
    if (spec.kind !== 'gradient') throw new Error('expected gradient');
    expect(spec.css).toMatch(/rgba\(255,\s*0,\s*0,\s*0\.5\)/);
    expect(spec.css).toContain('#00ff00');
  });
});
