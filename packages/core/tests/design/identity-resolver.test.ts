import { describe, it, expect } from 'vitest';
import { resolveIdentity } from '../../src/design/identity-resolver.js';
import { surfaceToCSS } from '../../src/design/surface-to-css.js';
import type { StructuredSurfaceStyles } from '../../src/design/identity/index.js';

const COLORS = {
  primary: '#6366f1', primaryLight: '#a5b4fc', primaryDark: '#4338ca',
  accent: '#f59e0b', accentLight: '#fcd34d',
  surface: '#ffffff', background: '#f8fafc',
  text: '#0f172a', textMuted: '#64748b', border: '#d1d5db',
  error: '#ef4444', success: '#22c55e', warning: '#f59e0b',
};

describe('resolveIdentity', () => {
  it('returns schemeColors, surface, colorWeight, and radius with defaults', () => {
    const result = resolveIdentity({ colors: COLORS, identity: {} }, surfaceToCSS);
    expect(result.schemeColors.surface).toBe('#ffffff');
    expect(result.surface.card.backgroundColor).toBe('#ffffff');
    expect(result.colorWeight.navBg).toBe('#ffffff');
    expect(result.radius(8)).toBe('8px');
  });

  it('colored-surface uses tonal layers and accent focus', () => {
    const result = resolveIdentity(
      { colors: COLORS, identity: { colorScheme: 'colored-surface' } },
      surfaceToCSS
    );
    expect(result.schemeColors.surface).not.toBe('#ffffff');
    expect(result.schemeColors.text).toBe('#ffffff');
    expect(result.surface.inputFocus.boxShadow).not.toContain('rgba(99,102,241,');
  });

  it('surface output matches direct call for bold', () => {
    const result = resolveIdentity(
      { colors: COLORS, identity: { surface: 'bold', depth: 0.7, shadowAngle: 45 } },
      surfaceToCSS
    );
    expect(result.surface.card.border).toContain('3px solid');
  });

  it('works with custom serializer', () => {
    const mockSerializer = (raw: StructuredSurfaceStyles, depth: number, angle: number) => ({
      cardShadowCount: raw.card.shadows.length,
      depth,
      angle,
    });
    const result = resolveIdentity({ colors: COLORS, identity: {} }, mockSerializer);
    expect(result.surface.cardShadowCount).toBe(2);
    expect(result.surface.depth).toBe(0.5);
    expect(result.surface.angle).toBe(0);
  });

  it('dark-surface uses dark colors', () => {
    const darkColors = { ...COLORS, surface: '#1e293b', text: '#e2e8f0' };
    const result = resolveIdentity(
      { colors: COLORS, darkColors, identity: { colorScheme: 'dark-surface' } },
      surfaceToCSS
    );
    expect(result.schemeColors.surface).toBe('#1e293b');
  });

  it('colorWeight branded-nav produces primary navBg', () => {
    const result = resolveIdentity(
      { colors: COLORS, identity: { colorWeight: 'branded-nav' } },
      surfaceToCSS
    );
    expect(result.colorWeight.navBg).toBe(COLORS.primary);
    expect(result.colorWeight.navText).toBe('#ffffff');
  });

  it('radius uses radiusPattern', () => {
    const result = resolveIdentity(
      { colors: COLORS, identity: { radiusPattern: 'top' } },
      surfaceToCSS
    );
    expect(result.radius(12)).toBe('12px 12px 0px 0px');
  });

  it('colored-surface with custom layers', () => {
    const r1 = resolveIdentity(
      { colors: COLORS, identity: { colorScheme: 'colored-surface' } },
      surfaceToCSS
    );
    const r2 = resolveIdentity(
      { colors: COLORS, identity: { colorScheme: 'colored-surface', coloredSurfaceLayers: { background: 10, surface: 30, primitive: 50 } } },
      surfaceToCSS
    );
    expect(r1.schemeColors.surface).not.toBe(r2.schemeColors.surface);
  });
});
