import { describe, it, expect } from 'vitest';

describe('public API exports', () => {
  it('exports background resolver from package root', async () => {
    const mod = await import('../../src/index.js');
    expect(typeof mod.resolveBackgroundLayers).toBe('function');
    expect(typeof mod.sanitizeSVGShapes).toBe('function');
    expect(typeof mod.BACKGROUND_RECIPES).toBe('object');
  });

  it('exports all layer resolvers', async () => {
    const mod = await import('../../src/index.js');
    expect(typeof mod.resolveSolid).toBe('function');
    expect(typeof mod.resolveGradient).toBe('function');
    expect(typeof mod.resolveImage).toBe('function');
    expect(typeof mod.resolvePattern).toBe('function');
    expect(typeof mod.resolveGrain).toBe('function');
  });

  it('exports all pattern generators', async () => {
    const mod = await import('../../src/index.js');
    expect(typeof mod.gridPatternSVG).toBe('function');
    expect(typeof mod.dotsPatternSVG).toBe('function');
    expect(typeof mod.diagonalPatternSVG).toBe('function');
    expect(typeof mod.isoPatternSVG).toBe('function');
    expect(typeof mod.crosshatchPatternSVG).toBe('function');
    expect(typeof mod.chevronPatternSVG).toBe('function');
  });
});
