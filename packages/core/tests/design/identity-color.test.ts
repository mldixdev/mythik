import { describe, it, expect } from 'vitest';
import { resolveSchemeColors, hexToRgba, resolveSurfaceStyles, resolveColorWeight } from '../../src/design/identity/index.js';
import { generateTonalStep } from '../../src/design/palette.js';

const LIGHT_COLORS = {
  primary: '#6366f1', primaryLight: '#a5b4fc', primaryDark: '#4338ca',
  accent: '#f59e0b', accentLight: '#fcd34d',
  surface: '#ffffff', background: '#f8fafc',
  text: '#0f172a', textMuted: '#64748b', border: '#d1d5db',
  error: '#ef4444', success: '#22c55e', warning: '#f59e0b',
};

const DARK_COLORS = {
  primary: '#a5b4fc', primaryLight: '#c7d2fe', primaryDark: '#6366f1',
  accent: '#fcd34d', accentLight: '#fde68a',
  surface: '#1e293b', background: '#0f172a',
  text: '#e2e8f0', textMuted: '#94a3b8', border: '#334155',
  error: '#ef4444', success: '#22c55e', warning: '#f59e0b',
};

describe('hexToRgba', () => {
  it('converts hex to rgba string', () => {
    expect(hexToRgba('#ffffff', 0.6)).toBe('rgba(255,255,255,0.6)');
    expect(hexToRgba('#1e293b', 0.4)).toBe('rgba(30,41,59,0.4)');
    expect(hexToRgba('#000000', 0.85)).toBe('rgba(0,0,0,0.85)');
  });
});

describe('resolveSchemeColors', () => {
  it('light-surface: returns colors unchanged', () => {
    const result = resolveSchemeColors('light-surface', LIGHT_COLORS);
    expect(result.surface).toBe(LIGHT_COLORS.surface);
    expect(result.text).toBe(LIGHT_COLORS.text);
    expect(result.primary).toBe(LIGHT_COLORS.primary);
  });

  it('dark-surface with darkColors: uses dark palette', () => {
    const result = resolveSchemeColors('dark-surface', LIGHT_COLORS, DARK_COLORS);
    expect(result.surface).toBe(DARK_COLORS.surface);
    expect(result.text).toBe(DARK_COLORS.text);
    expect(result.border).toBe(DARK_COLORS.border);
    expect(result.primary).toBe(DARK_COLORS.primary);
  });

  it('dark-surface without darkColors: generates fallback dark palette', () => {
    const result = resolveSchemeColors('dark-surface', LIGHT_COLORS);
    expect(result.surface).not.toBe(LIGHT_COLORS.surface);
    expect(result.text).not.toBe(LIGHT_COLORS.text);
  });

  it('colored-surface with default layers: uses tonal steps 25/45/65', () => {
    const result = resolveSchemeColors('colored-surface', LIGHT_COLORS);
    expect(result.background).toBe(generateTonalStep(LIGHT_COLORS.primary, 25));
    expect(result.surface).toBe(generateTonalStep(LIGHT_COLORS.primary, 45));
    expect(result.border).toBe(generateTonalStep(LIGHT_COLORS.primary, 75)); // primitive(65)+10
    expect(result.background).not.toBe(result.surface);
    expect(result.surface).not.toBe(result.border);
    expect(result.text).toBe('#ffffff');
    expect(result.textMuted).toBe('#ffffffb3');
  });

  it('colored-surface with custom layers', () => {
    const result = resolveSchemeColors('colored-surface', LIGHT_COLORS, undefined, { background: 10, surface: 30, primitive: 50 });
    const resultDefault = resolveSchemeColors('colored-surface', LIGHT_COLORS);
    expect(result.background).not.toBe(resultDefault.background);
    expect(result.surface).not.toBe(resultDefault.surface);
    expect(result.background).toBe(generateTonalStep(LIGHT_COLORS.primary, 10));
    expect(result.surface).toBe(generateTonalStep(LIGHT_COLORS.primary, 30));
  });

  it('colored-surface border auto-calculated from primitive + 10', () => {
    const result = resolveSchemeColors('colored-surface', LIGHT_COLORS, undefined, { background: 20, surface: 40, primitive: 60 });
    expect(result.border).toBe(generateTonalStep(LIGHT_COLORS.primary, 70));
  });

  it('light-surface ignores layers parameter', () => {
    const without = resolveSchemeColors('light-surface', LIGHT_COLORS);
    const withLayers = resolveSchemeColors('light-surface', LIGHT_COLORS, undefined, { background: 10, surface: 30, primitive: 50 });
    expect(without).toEqual(withLayers);
  });

  it('colored-surface: preserves primary/accent/error colors', () => {
    const result = resolveSchemeColors('colored-surface', LIGHT_COLORS);
    expect(result.primary).toBe(LIGHT_COLORS.primary);
    expect(result.accent).toBe(LIGHT_COLORS.accent);
    expect(result.error).toBe(LIGHT_COLORS.error);
  });
});

// --- Glass fix ---

describe('glass surface with color schemes', () => {
  const LIGHT_SC = { surface: '#ffffff', background: '#f8fafc', border: '#d1d5db', primary: '#6366f1', text: '#0f172a' };
  const DARK_SC = { surface: '#1e293b', background: '#0f172a', border: '#334155', primary: '#a5b4fc', text: '#e2e8f0' };

  it('glass with light colors uses light surface as base', () => {
    const s = resolveSurfaceStyles('glass', LIGHT_SC);
    expect(s.card.backgroundColor).toBe('#ffffff');
    expect(s.card.backgroundOpacity).toBe(0.6);
  });

  it('glass with dark colors uses dark surface as base (NOT hardcoded white)', () => {
    const s = resolveSurfaceStyles('glass', DARK_SC);
    expect(s.card.backgroundColor).toBe('#1e293b');
    expect(s.card.backgroundOpacity).toBe(0.6);
    expect(s.input.backgroundColor).toBe('#1e293b');
    expect(s.modal.backgroundColor).toBe('#1e293b');
    expect(s.buttonSecondary.backgroundColor).toBe('#1e293b');
  });

  it('glass border uses surface-derived rgba (semi-transparent)', () => {
    const s = resolveSurfaceStyles('glass', DARK_SC);
    expect(s.card.border!.color).toContain('rgba(30,41,59,');
  });
});

// --- AccentApplication ---

describe('AccentApplication in surface styles', () => {
  const COLORS = { surface: '#ffffff', background: '#f8fafc', border: '#d1d5db', primary: '#6366f1', text: '#0f172a' };

  it('cardLine top adds borderTop accent to card', () => {
    const s = resolveSurfaceStyles('elevated', COLORS, { cardLine: ['top'], accent: '#f59e0b' });
    expect(s.card.borderTop).toEqual({ width: 3, style: 'solid', color: '#f59e0b' });
  });

  it('cardLine left+top adds both borders', () => {
    const s = resolveSurfaceStyles('elevated', COLORS, { cardLine: ['top', 'left'], accent: '#f59e0b' });
    expect(s.card.borderTop).toEqual({ width: 3, style: 'solid', color: '#f59e0b' });
    expect(s.card.borderLeft).toEqual({ width: 3, style: 'solid', color: '#f59e0b' });
  });

  it('cardLine empty array: no accent borders', () => {
    const s = resolveSurfaceStyles('elevated', COLORS, { cardLine: [], accent: '#f59e0b' });
    expect(s.card.borderTop).toBeUndefined();
    expect(s.card.borderLeft).toBeUndefined();
  });

  it('accentButtons: buttonPrimary uses accent instead of primary', () => {
    const s = resolveSurfaceStyles('elevated', COLORS, { accentButtons: true, accent: '#f59e0b' });
    expect(s.buttonPrimary.backgroundColor).toBe('#f59e0b');
  });

  it('accentButtons false: buttonPrimary uses primary (default)', () => {
    const s = resolveSurfaceStyles('elevated', COLORS);
    expect(s.buttonPrimary.backgroundColor).toBe('#6366f1');
  });

  it('cardLine works with flat surface', () => {
    const s = resolveSurfaceStyles('flat', COLORS, { cardLine: ['left'], accent: '#f59e0b' });
    expect(s.card.borderLeft).toEqual({ width: 3, style: 'solid', color: '#f59e0b' });
    expect(s.card.border).toBeUndefined();
  });
});

// --- ColorWeight ---

describe('resolveColorWeight', () => {
  const CW_COLORS = { primary: '#6366f1', accent: '#f59e0b', surface: '#ffffff', background: '#f8fafc', text: '#0f172a', border: '#d1d5db' };
  const CW_DARK = { primary: '#a5b4fc', accent: '#fcd34d', surface: '#1e293b', background: '#0f172a', text: '#e2e8f0', border: '#334155' };

  it('monochrome: navBg is surface, sectionBg is background', () => {
    const r = resolveColorWeight('monochrome', CW_COLORS);
    expect(r.navBg).toBe(CW_COLORS.surface);
    expect(r.navText).toBe(CW_COLORS.text);
    expect(r.sectionBg).toBe(CW_COLORS.background);
    expect(r.heroBg).toBe('transparent');
  });

  it('branded-nav: navBg uses primary, navText is white', () => {
    const r = resolveColorWeight('branded-nav', CW_COLORS);
    expect(r.navBg).toBe(CW_COLORS.primary);
    expect(r.navText).toBe('#ffffff');
    expect(r.sectionBg).toBe(CW_COLORS.background);
  });

  it('gradient-hero: has heroGradient with primary→accent', () => {
    const r = resolveColorWeight('gradient-hero', CW_COLORS);
    expect(r.heroGradient).toContain('linear-gradient');
    expect(r.heroGradient).toContain(CW_COLORS.primary);
    expect(r.heroGradient).toContain(CW_COLORS.accent);
    expect(r.heroBg).toBe(CW_COLORS.primary);
  });

  it('ambient: sectionBg has primary tint (rgba)', () => {
    const r = resolveColorWeight('ambient', CW_COLORS);
    expect(r.sectionBg).toContain('rgba');
    expect(r.sectionBg).not.toBe(CW_COLORS.background);
    expect(r.navBg).toBe(CW_COLORS.surface);
  });

  it('dark-native: navBg is dark, sectionBg stays light', () => {
    const r = resolveColorWeight('dark-native', CW_COLORS, CW_DARK);
    expect(r.navBg).toBe(CW_DARK.surface);
    expect(r.navText).toBe(CW_DARK.text);
    expect(r.sectionBg).toBe(CW_COLORS.background);
  });
});
