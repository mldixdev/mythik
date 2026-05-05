import { describe, it, expect } from 'vitest';
import { resolveElevationStyle } from '../../src/design/identity/index.js';

describe('resolveElevationStyle', () => {
  it('diffuse: standard shadow with blur', () => {
    const css = resolveElevationStyle('diffuse', 0.5, { offset: 4, color: '#000' });
    expect(css).toContain('rgba');
    expect(css).not.toBe('none');
  });

  it('solid: no blur, solid offset', () => {
    const css = resolveElevationStyle('solid', 0.5, { offset: 4, color: '#000' });
    expect(css).toContain('2px 2px 0px 0px');
  });

  it('color: shadow uses provided color as rgba', () => {
    const css = resolveElevationStyle('color', 0.5, { offset: 4, color: '#0D9488' });
    expect(css).toContain('13,148,136');  // #0D=13, #94=148, #88=136
  });

  it('none: returns none', () => {
    expect(resolveElevationStyle('none', 0.5, { offset: 4, color: '#000' })).toBe('none');
  });

  it('depth 0 returns none regardless of style', () => {
    expect(resolveElevationStyle('diffuse', 0, { offset: 4, color: '#000' })).toBe('none');
    expect(resolveElevationStyle('solid', 0, { offset: 4, color: '#000' })).toBe('none');
  });

  it('depth 1 gives maximum intensity', () => {
    const css = resolveElevationStyle('diffuse', 1, { offset: 8, color: '#000' });
    expect(css).toContain('8px'); // full offset
    expect(css).toContain('12px'); // full blur
  });

  it('solid shadow color is direct, not rgba', () => {
    const css = resolveElevationStyle('solid', 1, { offset: 4, color: '#333' });
    expect(css).toContain('#333');
    expect(css).not.toContain('rgba');
  });
});
