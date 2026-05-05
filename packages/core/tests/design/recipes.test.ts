import { describe, it, expect } from 'vitest';
import { BACKGROUND_RECIPES } from '../../src/design/recipes/backgrounds.js';
import { resolveBackgroundLayers } from '../../src/design/background/resolver.js';

describe('BACKGROUND_RECIPES', () => {
  it('ships exactly 8 curated recipes', () => {
    const names = Object.keys(BACKGROUND_RECIPES);
    expect(names.sort()).toEqual([
      'arc-organic', 'comic-pop', 'grid-subtle', 'linear-aura',
      'notion-warm', 'raycast-mono', 'stripe-ribbons', 'vercel-center',
    ]);
  });

  it('every recipe resolves to at least 1 layer', () => {
    for (const bg of Object.values(BACKGROUND_RECIPES)) {
      const specs = resolveBackgroundLayers(bg);
      expect(specs.length).toBeGreaterThan(0);
    }
  });

  it('linear-aura has radial gradient + grain', () => {
    const specs = resolveBackgroundLayers(BACKGROUND_RECIPES['linear-aura']);
    const kinds = specs.map((s) => s.kind);
    expect(kinds).toContain('solid');
    expect(kinds).toContain('gradient');
    expect(kinds).toContain('grain');
  });

  it('grid-subtle has grid pattern', () => {
    const specs = resolveBackgroundLayers(BACKGROUND_RECIPES['grid-subtle']);
    const hasPattern = specs.some((s) => s.kind === 'pattern');
    expect(hasPattern).toBe(true);
  });

  it('notion-warm is solid-only (minimal)', () => {
    const specs = resolveBackgroundLayers(BACKGROUND_RECIPES['notion-warm']);
    expect(specs.length).toBe(1);
    expect(specs[0].kind).toBe('solid');
  });

  it('raycast-mono is solid-only (minimal)', () => {
    const specs = resolveBackgroundLayers(BACKGROUND_RECIPES['raycast-mono']);
    expect(specs.length).toBe(1);
    expect(specs[0].kind).toBe('solid');
  });

  it('comic-pop uses crosshatch pattern', () => {
    const specs = resolveBackgroundLayers(BACKGROUND_RECIPES['comic-pop']);
    const crosshatchFound = specs.some((s) => s.kind === 'pattern' && s.svg.includes('rotate(45'));
    expect(crosshatchFound).toBe(true);
  });
});
