import { describe, it, expect } from 'vitest';
import { resolveTokenRefs, resolveVariant } from '../../src/renderer/variants.js';

describe('resolveTokenRefs', () => {
  const tokens = {
    colors: { primary: '#0D9488', surface: '#FFFFFF', text: '#0F172A', border: '#E2E8F0' },
    shadow: { md: '0 4px 6px rgba(0,0,0,0.07)' },
    radius: { md: 12, lg: 16 },
  };

  it('resolves $path string to token value', () => {
    expect(resolveTokenRefs('$colors.primary', tokens)).toBe('#0D9488');
  });

  it('resolves nested $path', () => {
    expect(resolveTokenRefs('$shadow.md', tokens)).toBe('0 4px 6px rgba(0,0,0,0.07)');
  });

  it('resolves numeric token via $path', () => {
    expect(resolveTokenRefs('$radius.lg', tokens)).toBe(16);
  });

  it('passes through string without $', () => {
    expect(resolveTokenRefs('hello', tokens)).toBe('hello');
  });

  it('passes through number unchanged', () => {
    expect(resolveTokenRefs(42, tokens)).toBe(42);
  });

  it('passes through boolean unchanged', () => {
    expect(resolveTokenRefs(true, tokens)).toBe(true);
  });

  it('returns original string for unknown $path', () => {
    expect(resolveTokenRefs('$colors.nonexistent', tokens)).toBe('$colors.nonexistent');
  });

  it('resolves $path values inside object', () => {
    const result = resolveTokenRefs({
      backgroundColor: '$colors.primary',
      color: '#FFF',
      borderRadius: '$radius.md',
      padding: 16,
    }, tokens);
    expect(result).toEqual({
      backgroundColor: '#0D9488',
      color: '#FFF',
      borderRadius: 12,
      padding: 16,
    });
  });

  it('does not re-resolve a $path that resolves to a $-string', () => {
    const tokensWithDollar = { ...tokens, colors: { ...tokens.colors, alias: '$colors.primary' } };
    expect(resolveTokenRefs('$colors.alias', tokensWithDollar)).toBe('$colors.primary');
  });
});

describe('resolveVariant', () => {
  const tokens = {
    colors: { primary: '#0D9488', surface: '#FFFFFF', text: '#0F172A' },
    radius: { md: 12 },
    components: {
      button: {
        primary: {
          style: { backgroundColor: '$colors.primary', color: '#FFF', borderRadius: '$radius.md' },
          hover: { scale: 1.05, y: -1 },
          active: { scale: 0.95 },
          transition: { duration: 0.15 },
        },
        ghost: {
          style: { backgroundColor: 'transparent', color: '$colors.text' },
        },
      },
      box: {
        card: {
          style: { backgroundColor: '$colors.surface', borderRadius: 16 },
          hover: { y: -2 },
        },
      },
    },
  };

  it('resolves variant with $path references', () => {
    const result = resolveVariant('button', 'primary', tokens);
    expect(result).not.toBeNull();
    expect(result!.style).toEqual({
      backgroundColor: '#0D9488',
      color: '#FFF',
      borderRadius: 12,
    });
    expect(result!.hover).toEqual({ scale: 1.05, y: -1 });
    expect(result!.active).toEqual({ scale: 0.95 });
    expect(result!.transition).toEqual({ duration: 0.15 });
  });

  it('resolves variant for non-button types', () => {
    const result = resolveVariant('box', 'card', tokens);
    expect(result).not.toBeNull();
    expect(result!.style!.backgroundColor).toBe('#FFFFFF');
  });

  it('returns null when type not in components', () => {
    expect(resolveVariant('input', 'outlined', tokens)).toBeNull();
  });

  it('returns null when variant not found for type', () => {
    expect(resolveVariant('button', 'nonexistent', tokens)).toBeNull();
  });

  it('returns null when tokens has no components', () => {
    expect(resolveVariant('button', 'primary', { colors: {} })).toBeNull();
  });

  it('returns null when tokens is undefined', () => {
    expect(resolveVariant('button', 'primary', undefined)).toBeNull();
  });

  it('handles variant with only style (no interactions)', () => {
    const result = resolveVariant('button', 'ghost', tokens);
    expect(result).not.toBeNull();
    expect(result!.style).toEqual({ backgroundColor: 'transparent', color: '#0F172A' });
    expect(result!.hover).toBeUndefined();
    expect(result!.active).toBeUndefined();
  });
});

describe('resolveVariant — animations (plan 3 Task 14)', () => {
  const baseTokens = {
    colors: { primary: '#0D9488' },
    components: {
      button: {
        ctaPulse: {
          style: { backgroundColor: '$colors.primary' },
          animations: { ambient: { recipe: 'pulse-primary' } },
        },
        silent: {
          style: { backgroundColor: '$colors.primary' },
          animations: null,
        },
        noHover: {
          style: { backgroundColor: '$colors.primary' },
          animations: { hover: null },
        },
        plain: {
          style: { backgroundColor: '$colors.primary' },
        },
      },
    },
  };

  it('passes through variant.animations to ResolvedVariant', () => {
    const result = resolveVariant('button', 'ctaPulse', baseTokens);
    expect(result).not.toBeNull();
    expect(result!.animations).toEqual({ ambient: { recipe: 'pulse-primary' } });
  });

  it('preserves whole-field null (cascade-neutral level indicator)', () => {
    const result = resolveVariant('button', 'silent', baseTokens);
    expect(result).not.toBeNull();
    expect(result!.animations).toBeNull();
  });

  it('preserves per-trigger null (disables inherited trigger)', () => {
    const result = resolveVariant('button', 'noHover', baseTokens);
    expect(result).not.toBeNull();
    expect(result!.animations).toEqual({ hover: null });
  });

  it('produces no animations field when variant omits it', () => {
    const result = resolveVariant('button', 'plain', baseTokens);
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('animations');
  });

  it('resolves top-level $path references inside animations', () => {
    // Variant's `animations` field at the top-level accepts $path strings that
    // resolve to full ElementAnimations objects — mirrors how style/hover
    // accept $path references to token objects.
    const tokensWithAnimRef = {
      ...baseTokens,
      animations: {
        interactive: { mount: { recipe: 'fade-up' }, hover: { recipe: 'lift' } },
      },
      components: {
        button: {
          linked: {
            style: { backgroundColor: '#000' },
            animations: '$animations.interactive',
          },
        },
      },
    };
    const result = resolveVariant('button', 'linked', tokensWithAnimRef);
    expect(result).not.toBeNull();
    expect(result!.animations).toEqual({
      mount: { recipe: 'fade-up' },
      hover: { recipe: 'lift' },
    });
  });
});
