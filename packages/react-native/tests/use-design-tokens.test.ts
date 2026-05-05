import { describe, it, expect } from 'vitest';
import { DEFAULTS } from 'mythik';
import { useDesignTokens } from '../src/primitives/use-design-tokens.js';

describe('useDesignTokens (RN)', () => {
  it('returns defaults when tokens is undefined', () => {
    const t = useDesignTokens(undefined);
    expect(t.colors.primary).toBe('#6366f1');
    expect(t.shape.radius.md).toBe(8);
    expect(t.typography.fontFamily.base).toBe('Inter');
    expect(t.spacing.unit).toBe(4);
    expect(t.motion.duration.fast).toBe(150);
    expect(t.opacity.disabled).toBe(0.4);
  });

  it('returns elevation as native shadow props', () => {
    const t = useDesignTokens(undefined);
    expect(t.elevation.md).toEqual({
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      shadowOpacity: 0.15,
      shadowColor: '#000000',
    });
  });

  it('elevation.none has zero opacity', () => {
    const t = useDesignTokens(undefined);
    expect(t.elevation.none.shadowOpacity).toBe(0);
  });

  it('extracts colors from tokens', () => {
    const t = useDesignTokens({ colors: { primary: '#0D9488' } });
    expect(t.colors.primary).toBe('#0D9488');
    expect(t.colors.text).toBe('#0f172a'); // default fallback
  });

  it('extracts shape from tokens', () => {
    const t = useDesignTokens({ shape: { radius: { md: 24 } } });
    expect(t.shape.radius.md).toBe(24);
    expect(t.shape.radius.sm).toBe(4);
  });

  it('typography weight returns strings for RN', () => {
    const t = useDesignTokens(undefined);
    expect(t.typography.weight.bold).toBe('700');
    expect(t.typography.weight.normal).toBe('400');
  });

  it('extracts custom elevation from tokens', () => {
    const t = useDesignTokens({
      elevation: {
        md: { shadowOffset: [0, 8], shadowRadius: 20, shadowOpacity: 0.25, shadowColor: '#FF0000' },
      },
    });
    expect(t.elevation.md).toEqual({
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 20,
      shadowOpacity: 0.25,
      shadowColor: '#FF0000',
    });
  });

  // --- Surface styles (identity) ---

  it('returns elevated surface styles by default', () => {
    const t = useDesignTokens(undefined);
    expect(t.surface.card).toBeDefined();
    expect(t.surface.buttonPrimary).toBeDefined();
    expect(t.surface.card.backgroundColor).toBe('#ffffff');
  });

  it('returns bold surface styles with numeric borderWidth', () => {
    // Without overrideSurfaceBorders, bold surface produces its native thick text-colored border
    const t = useDesignTokens({ identity: { surface: 'bold' } });
    expect(t.surface.card.borderWidth).toBe(3);
    expect(t.surface.card.borderStyle).toBe('solid');
    expect(t.surface.card.borderColor).toBe('#0f172a');
  });

  it('glass has semi-transparent bg and blur data', () => {
    const t = useDesignTokens({ identity: { surface: 'glass' } });
    expect(t.surface.card.backgroundColor).toContain('rgba');
    expect(t.surface.card.blur).toEqual({ radius: 16 });
  });

  it('outlined surface has transparent bg and border', () => {
    const t = useDesignTokens({ identity: { surface: 'outlined' } });
    expect(t.surface.card.backgroundColor).toBe('transparent');
    expect(t.surface.card.borderWidth).toBe(1);
  });

  // --- BUG FIX: cardLine works in RN ---

  it('cardLine produces borderTopWidth in RN', () => {
    const t = useDesignTokens({ identity: { surface: 'elevated', accentApplication: { cardLine: ['top', 'left'] } } });
    expect(t.surface.card.borderTopWidth).toBe(3);
    expect(t.surface.card.borderTopColor).toBeDefined();
    expect(t.surface.card.borderLeftWidth).toBe(3);
  });

  // --- BUG FIX: neo card has shadow ---

  it('neo card has shadow props', () => {
    const t = useDesignTokens({ identity: { surface: 'neo' } });
    expect(t.surface.card.shadowRadius).toBeGreaterThan(0);
    expect(t.surface.card.shadowOpacity).toBeGreaterThan(0);
  });

  // --- BUG FIX: focus ring available ---

  it('inputFocus has focusRing data', () => {
    const t = useDesignTokens(undefined);
    expect(t.surface.inputFocus.focusRing).toBeDefined();
    expect(t.surface.inputFocus.focusRing!.width).toBe(3);
  });

  // --- Glass blur passthrough ---

  it('glass surface exposes blur for BlurView', () => {
    const t = useDesignTokens({ identity: { surface: 'glass' } });
    expect(t.surface.card.blur).toEqual({ radius: 16 });
    expect(t.surface.modal.blur).toEqual({ radius: 24 });
  });

  // --- Defaults match core DEFAULTS (F3) ---

  it('defaults match core DEFAULTS (single source of truth)', () => {
    const t = useDesignTokens(undefined);

    // Colors
    expect(t.colors.primary).toBe(DEFAULTS.colors.primary);
    expect(t.colors.accent).toBe(DEFAULTS.colors.accent);
    expect(t.colors.surface).toBe(DEFAULTS.colors.surface);
    expect(t.colors.text).toBe(DEFAULTS.colors.text);

    // Shape
    expect(t.shape.radius.md).toBe(DEFAULTS.shape.radius.md);

    // Typography — RN uses string fontWeight, core uses number
    expect(t.typography.weight.bold).toBe(String(DEFAULTS.typography.weight.bold));
    expect(t.typography.weight.normal).toBe(String(DEFAULTS.typography.weight.normal));

    // Spacing
    expect(t.spacing.unit).toBe(DEFAULTS.spacing.unit);
    expect(t.spacing.scale.md).toBe(DEFAULTS.spacing.scale.md);

    // Elevation — RN uses { shadowOffset: {width, height} }, core uses [x,y]
    expect(t.elevation.md.shadowRadius).toBe(DEFAULTS.elevation.md.shadowRadius);
    expect(t.elevation.md.shadowOpacity).toBe(DEFAULTS.elevation.md.shadowOpacity);
    expect(t.elevation.md.shadowColor).toBe(DEFAULTS.elevation.md.shadowColor);

    // Motion
    expect(t.motion.duration.fast).toBe(DEFAULTS.motion.duration.fast);

    // Opacity
    expect(t.opacity.disabled).toBe(DEFAULTS.opacity.disabled);

    // Identity
    expect(t.identity.surface).toBe(DEFAULTS.identity.surface);
  });
});
