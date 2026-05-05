import { describe, it, expect } from 'vitest';
import { resolveDeepTokens, DEFAULTS } from '../../src/design/deep-tokens.js';

describe('DEFAULTS', () => {
  it('has all required categories', () => {
    expect(DEFAULTS.colors).toBeDefined();
    expect(DEFAULTS.shape).toBeDefined();
    expect(DEFAULTS.typography).toBeDefined();
    expect(DEFAULTS.spacing).toBeDefined();
    expect(DEFAULTS.elevation).toBeDefined();
    expect(DEFAULTS.motion).toBeDefined();
    expect(DEFAULTS.opacity).toBeDefined();
  });

  it('has coherent default colors', () => {
    expect(DEFAULTS.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(DEFAULTS.colors.surface).toBe('#ffffff');
    expect(DEFAULTS.colors.error).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('has 6 radius stops', () => {
    expect(Object.keys(DEFAULTS.shape.radius)).toHaveLength(6);
    expect(DEFAULTS.shape.radius.full).toBe(9999);
  });
});

describe('resolveDeepTokens', () => {
  it('returns defaults when no tokens provided', () => {
    const result = resolveDeepTokens(undefined);
    expect((result as Record<string, unknown>).colors).toBeDefined();
    expect(((result as Record<string, unknown>).colors as Record<string, string>).primary).toBe(DEFAULTS.colors.primary);
    const shape = (result as Record<string, unknown>).shape as { radius: Record<string, number> };
    expect(shape.radius.md).toBe(DEFAULTS.shape.radius.md);
  });

  it('returns defaults when empty tokens provided', () => {
    const result = resolveDeepTokens({});
    expect(((result as Record<string, unknown>).colors as Record<string, string>).primary).toBe(DEFAULTS.colors.primary);
  });

  it('manual override wins over defaults', () => {
    const result = resolveDeepTokens({
      colors: { primary: '#FF0000' },
      shape: { radius: { md: 24 } },
    });
    const colors = (result as Record<string, unknown>).colors as Record<string, string>;
    const shape = (result as Record<string, unknown>).shape as { radius: Record<string, number> };
    expect(colors.primary).toBe('#FF0000');
    expect(shape.radius.md).toBe(24);
    // Non-overridden values are defaults
    expect(colors.surface).toBe(DEFAULTS.colors.surface);
    expect(shape.radius.sm).toBe(DEFAULTS.shape.radius.sm);
  });

  it('DNA derives tokens, manual overrides win over DNA', () => {
    const result = resolveDeepTokens({
      dna: { primary: '#0D9488', roundness: 0.9 },
      shape: { radius: { md: 99 } },
    });
    const shape = (result as Record<string, unknown>).shape as { radius: Record<string, number> };
    // md overridden manually
    expect(shape.radius.md).toBe(99);
    // lg comes from DNA (roundness 0.9 → ~22)
    expect(shape.radius.lg).toBeGreaterThan(15);
    // colors come from DNA
    const colors = (result as Record<string, unknown>).colors as Record<string, string>;
    expect(colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('DNA with just primary generates full tokens', () => {
    const result = resolveDeepTokens({
      dna: { primary: '#3B82F6' },
    }) as Record<string, unknown>;
    const colors = result.colors as Record<string, string>;
    expect(colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(colors.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    const shape = result.shape as { radius: Record<string, number> };
    expect(shape.radius.md).toBeGreaterThan(0);
    const typography = result.typography as { fontFamily: Record<string, string> };
    expect(typography.fontFamily.base).toBeTruthy();
    const motion = result.motion as { duration: Record<string, number> };
    expect(motion.duration.fast).toBeGreaterThan(0);
  });

  it('preserves components and modes from user tokens', () => {
    const result = resolveDeepTokens({
      components: { button: { primary: { style: { color: 'red' } } } },
      modes: { dark: { colors: { surface: '#111' } } },
    }) as Record<string, unknown>;
    expect(result.components).toBeDefined();
    expect(result.modes).toBeDefined();
  });

  it('result is transparent (inspectable as plain object)', () => {
    const result = resolveDeepTokens({ dna: { primary: '#0D9488' } });
    const json = JSON.stringify(result);
    expect(json).toBeTruthy();
    const parsed = JSON.parse(json);
    expect(parsed.colors.primary).toBeTruthy();
  });
});
