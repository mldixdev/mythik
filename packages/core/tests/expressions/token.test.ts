import { describe, it, expect } from 'vitest';
import { tokenHandler } from '../../src/expressions/handlers/token.js';
import type { ResolverContext } from '../../src/types.js';

describe('$token handler', () => {
  const tokens = {
    colors: { primary: '#E63946', secondary: '#457B9D', text: '#F1FAEE' },
    spacing: { unit: 8, scale: [0, 4, 8, 16, 24, 32, 48, 64] },
    radius: { sm: 4, md: 8, lg: 16, full: 9999 },
    typography: { heading: { family: 'Playfair Display', weight: 700 } },
  };

  const context: ResolverContext = {
    getState: () => undefined,
    setState: () => {},
    tokens,
  };

  it('resolves a simple token path', () => {
    expect(tokenHandler.resolve({ $token: 'colors.primary' }, context)).toBe('#E63946');
  });

  it('resolves a nested token path', () => {
    expect(tokenHandler.resolve({ $token: 'typography.heading.family' }, context)).toBe('Playfair Display');
  });

  it('resolves a numeric token', () => {
    expect(tokenHandler.resolve({ $token: 'radius.lg' }, context)).toBe(16);
  });

  it('resolves array index in token path', () => {
    expect(tokenHandler.resolve({ $token: 'spacing.scale.3' }, context)).toBe(16);
  });

  it('applies multiply to numeric tokens', () => {
    expect(tokenHandler.resolve({ $token: 'spacing.unit', multiply: 3 }, context)).toBe(24);
  });

  it('throws for missing token', () => {
    expect(() => tokenHandler.resolve({ $token: 'colors.missing' }, context))
      .toThrow('Token "colors.missing" not found');
  });

  it('throws when no tokens configured', () => {
    const noTokenCtx: ResolverContext = { getState: () => undefined, setState: () => {} };
    expect(() => tokenHandler.resolve({ $token: 'colors.primary' }, noTokenCtx))
      .toThrow('no tokens are configured');
  });

  it('has the correct key', () => {
    expect(tokenHandler.key).toBe('$token');
  });
});
