import { describe, it, expect } from 'vitest';
import { resolvePattern } from '../../../../src/design/background/patterns/resolver.js';
import type { PatternLayerConfig } from '../../../../src/design/identity/types.js';

describe('resolvePattern', () => {
  it('dispatches to grid', () => {
    const spec = resolvePattern({ type: 'pattern', kind: 'grid', spacing: 40 }, 0);
    if (spec.kind !== 'pattern') throw new Error('expected pattern');
    expect(spec.svg).toContain('<line');
    expect(spec.svg).toContain('width="40"');
    expect(spec.tileSize).toBe(40);
  });

  it('dispatches to dots', () => {
    const spec = resolvePattern({ type: 'pattern', kind: 'dots', spacing: 20, dotRadius: 3 }, 0);
    if (spec.kind !== 'pattern') throw new Error('expected pattern');
    expect(spec.svg).toContain('<circle');
    expect(spec.svg).toContain('r="3"');
  });

  it('dispatches to diagonal with angle', () => {
    const spec = resolvePattern({ type: 'pattern', kind: 'diagonal', spacing: 20, angle: -45 }, 0);
    if (spec.kind !== 'pattern') throw new Error('expected pattern');
    expect(spec.svg).toContain('rotate(-45)');
  });

  it('dispatches to iso', () => {
    const spec = resolvePattern({ type: 'pattern', kind: 'iso', spacing: 30 }, 0);
    if (spec.kind !== 'pattern') throw new Error('expected pattern');
    expect(spec.svg.match(/<line/g)?.length).toBe(3);
  });

  it('dispatches to crosshatch', () => {
    const spec = resolvePattern({ type: 'pattern', kind: 'crosshatch', spacing: 20 }, 0);
    if (spec.kind !== 'pattern') throw new Error('expected pattern');
    expect(spec.svg).toContain('rotate(45');
    expect(spec.svg).toContain('rotate(-45');
  });

  it('dispatches to chevron', () => {
    const spec = resolvePattern({ type: 'pattern', kind: 'chevron', spacing: 40 }, 0);
    if (spec.kind !== 'pattern') throw new Error('expected pattern');
    expect(spec.svg).toContain('<polyline');
  });

  it('dispatches to custom-svg with sanitization', () => {
    const spec = resolvePattern({
      type: 'pattern',
      kind: 'custom-svg',
      shapes: '<circle r="5" onclick="alert(1)"/><script>xss()</script>',
      tileSize: 20,
    }, 0);
    if (spec.kind !== 'pattern') throw new Error('expected pattern');
    expect(spec.svg).toContain('<circle');
    expect(spec.svg).not.toContain('onclick');
    expect(spec.svg).not.toContain('script');
    expect(spec.tileSize).toBe(20);
  });

  it('custom-svg without tileSize defaults to 20', () => {
    const spec = resolvePattern({ type: 'pattern', kind: 'custom-svg', shapes: '<circle r="2"/>' }, 0);
    if (spec.kind !== 'pattern') throw new Error('expected pattern');
    expect(spec.tileSize).toBe(20);
  });

  it('throws for unknown kind', () => {
    expect(() => resolvePattern({ type: 'pattern', kind: 'bogus' as never, spacing: 20 }, 0)).toThrow();
  });
});
