import { describe, it, expect } from 'vitest';
import { resolveGrain } from '../../../src/design/background/grain.js';
import type { GrainLayerConfig } from '../../../src/design/identity/types.js';

describe('resolveGrain', () => {
  it('emits SVG with feTurbulence filter and rect', () => {
    const spec = resolveGrain({ type: 'grain', intensity: 0.05, scale: 0.9 }, 0);
    if (spec.kind !== 'grain') throw new Error('expected grain');
    expect(spec.svg).toContain('feTurbulence');
    expect(spec.svg).toContain('baseFrequency="0.9"');
    expect(spec.svg).toContain('<rect');
    expect(spec.svg).toContain('filter="url(#');
  });

  it('applies monochrome via feColorMatrix saturation strip', () => {
    const spec = resolveGrain({ type: 'grain', monochrome: true }, 0);
    if (spec.kind !== 'grain') throw new Error('expected grain');
    expect(spec.svg).toContain('feColorMatrix');
    expect(spec.svg).toContain('type="saturate"');
    expect(spec.svg).toContain('values="0"');
  });

  it('skips feColorMatrix when monochrome is false', () => {
    const spec = resolveGrain({ type: 'grain', monochrome: false }, 0);
    if (spec.kind !== 'grain') throw new Error('expected grain');
    expect(spec.svg).not.toContain('feColorMatrix');
  });

  it('defaults intensity to 0.05 and scale to 0.9 and monochrome to true', () => {
    const spec = resolveGrain({ type: 'grain' }, 0);
    if (spec.kind !== 'grain') throw new Error('expected grain');
    expect(spec.svg).toContain('baseFrequency="0.9"');
    expect(spec.svg).toContain('opacity="0.05"');
    expect(spec.svg).toContain('feColorMatrix');
  });
});
