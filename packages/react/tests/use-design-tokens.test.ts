import { describe, it, expect } from 'vitest';
import type { CSSProperties } from 'react';
import { DEFAULTS } from 'mythik';
import { useDesignTokens } from '../src/primitives/use-design-tokens.js';

describe('useDesignTokens (web)', () => {
  it('returns defaults when tokens is undefined', () => {
    const t = useDesignTokens(undefined);
    expect(t.colors.primary).toBe('#6366f1');
    expect(t.shape.radius.md).toBe(8);
    expect(t.typography.fontFamily.base).toContain('Inter');
    expect(t.spacing.unit).toBe(4);
    expect(t.elevation.md).toContain('rgba');
    expect(t.motion.duration.fast).toBe(150);
    expect(t.opacity.disabled).toBe(0.4);
  });

  it('extracts colors from tokens', () => {
    const t = useDesignTokens({ colors: { primary: '#0D9488', surface: '#111' } });
    expect(t.colors.primary).toBe('#0D9488');
    expect(t.colors.surface).toBe('#111');
    expect(t.colors.text).toBe('#0f172a'); // default fallback
  });

  it('extracts shape from tokens', () => {
    const t = useDesignTokens({ shape: { radius: { md: 24 } } });
    expect(t.shape.radius.md).toBe(24);
    expect(t.shape.radius.sm).toBe(4); // default
  });

  it('extracts typography from tokens', () => {
    const t = useDesignTokens({
      typography: { fontFamily: { heading: 'Playfair Display' }, weight: { bold: 800 } },
    });
    expect(t.typography.fontFamily.heading).toBe('Playfair Display');
    expect(t.typography.fontFamily.base).toContain('Inter');
    expect(t.typography.weight.bold).toBe(800);
  });

  it('converts elevation to CSS boxShadow string', () => {
    const t = useDesignTokens({
      elevation: {
        md: { shadowOffset: [0, 4], shadowRadius: 12, shadowOpacity: 0.15, shadowColor: '#000000' },
      },
    });
    expect(t.elevation.md).toBe('0px 4px 12px rgba(0,0,0,0.15)');
  });

  it('elevation.none produces no shadow', () => {
    const t = useDesignTokens(undefined);
    expect(t.elevation.none).toBe('none');
  });

  it('extracts spacing from tokens', () => {
    const t = useDesignTokens({ spacing: { unit: 6, scale: { md: 24 } } });
    expect(t.spacing.unit).toBe(6);
    expect(t.spacing.scale.md).toBe(24);
    expect(t.spacing.scale.sm).toBe(8); // default
  });

  it('extracts motion from tokens', () => {
    const t = useDesignTokens({ motion: { duration: { fast: 100 }, spring: { damping: 30, stiffness: 200, mass: 1 } } });
    expect(t.motion.duration.fast).toBe(100);
    expect(t.motion.duration.normal).toBe(250); // default
    expect(t.motion.spring.damping).toBe(30);
  });

  it('extracts opacity from tokens', () => {
    const t = useDesignTokens({ opacity: { disabled: 0.3, muted: 0.5 } });
    expect(t.opacity.disabled).toBe(0.3);
    expect(t.opacity.pressed).toBe(0.85); // default
  });

  // --- Surface styles (identity) ---

  it('returns elevated surface styles by default', () => {
    const t = useDesignTokens(undefined);
    expect(t.surface.card.boxShadow).toBeTruthy();
    expect(t.surface.input.border).toBeTruthy();
    expect(t.surface.buttonPrimary.backgroundColor).toBeTruthy();
    expect(t.surface.buttonSecondary).toBeDefined();
    expect(t.surface.modal.boxShadow).toBeTruthy();
  });

  it('returns outlined surface styles', () => {
    const t = useDesignTokens({ identity: { surface: 'outlined' } });
    expect(t.surface.card.backgroundColor).toBe('transparent');
    // Without overrideSurfaceBorders, surface type controls shadows — outlined has none
    expect(t.surface.card.boxShadow).toBe('none');
  });

  it('passes resolved colors to surface styles', () => {
    // Without overrideSurfaceBorders, bold surface produces its native thick text-colored border
    const t = useDesignTokens({ identity: { surface: 'bold' }, colors: { text: '#111' } });
    expect(t.surface.card.border).toContain('#111');
  });

  it('glass surface has backdropFilter', () => {
    const t = useDesignTokens({ identity: { surface: 'glass' } });
    expect(t.surface.card.backdropFilter).toContain('blur');
  });

  // --- Depth + Shadow Angle ---

  it('depth and shadowAngle affect surface shadows', () => {
    const t0 = useDesignTokens({ identity: { depth: 0 } });
    const t1 = useDesignTokens({ identity: { depth: 1 } });
    expect(t0.surface.card.boxShadow).not.toBe(t1.surface.card.boxShadow);
    expect(t0.identity.depth).toBe(0);
    expect(t1.identity.depth).toBe(1);
  });

  it('shadowAngle defaults to 0', () => {
    const t = useDesignTokens(undefined);
    expect(t.identity.shadowAngle).toBe(0);
    expect(t.identity.depth).toBe(0.5);
  });

  // --- Phase 3: Color Scheme, Color Weight, Accent ---

  it('colorScheme dark-surface: t.colors stays original, surface styles use dark', () => {
    const t = useDesignTokens({ dna: { primary: '#0D9488' }, identity: { colorScheme: 'dark-surface' } });
    // t.colors stays as original light palette (controls stay readable)
    expect(t.colors.surface).toBe('#ffffff');
    expect(t.identity.colorScheme).toBe('dark-surface');
    // But surface styles use scheme-adjusted colors (dark cards)
    expect(t.surface.card.backgroundColor).not.toBe('#ffffff');
  });

  it('colorWeight branded-nav produces primary navBg', () => {
    const t = useDesignTokens({ identity: { colorWeight: 'branded-nav' } });
    expect(t.colorWeight.navBg).toBe(t.colors.primary);
    expect(t.colorWeight.navText).toBe('#ffffff');
  });

  it('accentApplication cardLine appears in surface styles', () => {
    const t = useDesignTokens({ identity: { accentApplication: { cardLine: ['top'] } } });
    expect(t.surface.card.borderTop).toBe(`3px solid ${t.colors.accent}`);
  });

  it('colored-surface produces 3 distinct layer colors', () => {
    const t = useDesignTokens({ identity: { colorScheme: 'colored-surface' } });
    expect(t.surface.card.backgroundColor).not.toBe(t.surface.input.backgroundColor);
  });

  it('colored-surface focus ring uses accent, not primary', () => {
    const t = useDesignTokens({ identity: { colorScheme: 'colored-surface' } });
    expect(t.surface.inputFocus.boxShadow).toBeDefined();
    // Should NOT contain indigo primary rgba
    expect(t.surface.inputFocus.boxShadow).not.toContain('rgba(99,102,241,');
  });

  it('colored-surface custom layers change surface colors', () => {
    const t1 = useDesignTokens({ identity: { colorScheme: 'colored-surface' } });
    const t2 = useDesignTokens({ identity: { colorScheme: 'colored-surface', coloredSurfaceLayers: { background: 10, surface: 30, primitive: 50 } } });
    expect(t1.surface.card.backgroundColor).not.toBe(t2.surface.card.backgroundColor);
  });

  it('defaults: light-surface, monochrome, no accent', () => {
    const t = useDesignTokens(undefined);
    expect(t.identity.colorScheme).toBe('light-surface');
    expect(t.identity.colorWeight).toBe('monochrome');
    expect(t.identity.accentApplication.buttons).toBe(false);
    expect(t.identity.accentApplication.cardLine).toEqual([]);
    expect(t.colorWeight.navBg).toBe(t.colors.surface);
  });

  // --- Surface CSSProperties compatibility (F2) ---

  it('surface style categories are spreadable as CSSProperties without casting', () => {
    const t = useDesignTokens(undefined);
    const cardStyle: CSSProperties = { ...t.surface.card };
    const inputStyle: CSSProperties = { ...t.surface.input };
    const focusStyle: CSSProperties = { ...t.surface.inputFocus };
    const btnPrimary: CSSProperties = { ...t.surface.buttonPrimary };
    const btnSecondary: CSSProperties = { ...t.surface.buttonSecondary };
    const modalStyle: CSSProperties = { ...t.surface.modal };

    expect(cardStyle.backgroundColor).toBe('#ffffff');
    expect(inputStyle.border).toBeTruthy();
    expect(focusStyle.border).toBeTruthy();
    expect(btnPrimary.backgroundColor).toBeTruthy();
    expect(btnSecondary).toBeDefined();
    expect(modalStyle.backgroundColor).toBe('#ffffff');
  });

  // --- Defaults match core DEFAULTS (F3) ---

  it('defaults match core DEFAULTS (single source of truth)', () => {
    const t = useDesignTokens(undefined);

    // Colors
    expect(t.colors.primary).toBe(DEFAULTS.colors.primary);
    expect(t.colors.accent).toBe(DEFAULTS.colors.accent);
    expect(t.colors.surface).toBe(DEFAULTS.colors.surface);
    expect(t.colors.text).toBe(DEFAULTS.colors.text);
    expect(t.colors.error).toBe(DEFAULTS.colors.error);

    // Shape
    expect(t.shape.radius.sm).toBe(DEFAULTS.shape.radius.sm);
    expect(t.shape.radius.md).toBe(DEFAULTS.shape.radius.md);
    expect(t.shape.radius.xl).toBe(DEFAULTS.shape.radius.xl);

    // Typography
    expect(t.typography.fontFamily.base).toContain('Inter');
    expect(t.typography.weight.bold).toBe(DEFAULTS.typography.weight.bold);

    // Spacing
    expect(t.spacing.unit).toBe(DEFAULTS.spacing.unit);
    expect(t.spacing.scale.md).toBe(DEFAULTS.spacing.scale.md);

    // Motion
    expect(t.motion.duration.fast).toBe(DEFAULTS.motion.duration.fast);
    expect(t.motion.spring.damping).toBe(DEFAULTS.motion.spring.damping);

    // Opacity
    expect(t.opacity.disabled).toBe(DEFAULTS.opacity.disabled);

    // Identity
    expect(t.identity.surface).toBe(DEFAULTS.identity.surface);
    expect(t.identity.typographyHierarchy).toBe(DEFAULTS.identity.typographyHierarchy);
  });

  describe('border/elevation identity override', () => {
    it('does NOT override when overrideSurfaceBorders is false (default)', () => {
      const t = useDesignTokens({
        identity: { surface: 'outlined', borderWidth: 3, borderStyle: 'dashed' },
      });
      // Override disabled → surface controls border, outlined has 1px solid
      expect(t.surface.card.border).not.toContain('dashed');
    });

    it('overrides card border when overrideSurfaceBorders is true', () => {
      const t = useDesignTokens({
        identity: { overrideSurfaceBorders: true, borderWidth: 3, borderStyle: 'dashed', borderColor: 'primary' },
      });
      expect(t.surface.card.border).toBe(`3px dashed ${t.colors.primary}`);
    });

    it('overrides card elevation when overrideSurfaceBorders is true', () => {
      const t = useDesignTokens({
        identity: { overrideSurfaceBorders: true, elevationStyle: 'none' },
      });
      expect(t.surface.card.boxShadow).toBe('none');
    });

    it('overrides modal border same as card', () => {
      const t = useDesignTokens({
        identity: { overrideSurfaceBorders: true, borderWidth: 2, borderStyle: 'dotted', borderColor: 'accent' },
      });
      expect(t.surface.modal.border).toBe(`2px dotted ${t.colors.accent}`);
    });

    it('does NOT override input border when only overrideSurfaceBorders is true', () => {
      const t = useDesignTokens({
        identity: { overrideSurfaceBorders: true, borderWidth: 3, borderStyle: 'dashed', borderColor: 'primary' },
      });
      expect(t.surface.input.border).not.toContain('dashed');
    });

    it('overrides input and buttons when overrideInputButtons is true', () => {
      const t = useDesignTokens({
        identity: { overrideInputButtons: true, borderWidth: 3, borderStyle: 'dashed', borderColor: 'primary' },
      });
      expect(t.surface.input.border).toContain('dashed');
      expect(t.surface.buttonPrimary.border).toContain('dashed');
      // card NOT overridden (overrideSurfaceBorders is false)
      expect(t.surface.card.border).not.toContain('dashed');
    });

    it('both flags override all slots except inputFocus', () => {
      const t = useDesignTokens({
        identity: { overrideSurfaceBorders: true, overrideInputButtons: true, borderWidth: 2, borderStyle: 'dotted', borderColor: 'accent' },
      });
      expect(t.surface.card.border).toContain('dotted');
      expect(t.surface.modal.border).toContain('dotted');
      expect(t.surface.input.border).toContain('dotted');
      expect(t.surface.buttonPrimary.border).toContain('dotted');
      expect(t.surface.buttonSecondary.border).toContain('dotted');
    });

    it('exposes borderColor and elevationColor in t.identity', () => {
      const t = useDesignTokens({
        identity: { borderColor: 'accent', elevationColor: 'primary' },
      });
      expect(t.identity.borderColor).toBe('accent');
      expect(t.identity.elevationColor).toBe('primary');
    });

    it('defaults borderColor to neutral and elevationColor to dark', () => {
      const t = useDesignTokens(undefined);
      expect(t.identity.borderColor).toBe('neutral');
      expect(t.identity.elevationColor).toBe('dark');
    });

    it('resolves borderColor text to hex when enabled', () => {
      const t = useDesignTokens({
        identity: { overrideSurfaceBorders: true, borderWidth: 1, borderStyle: 'solid', borderColor: 'text' },
      });
      expect(t.surface.card.border).toContain(t.colors.text);
    });
  });
});
