import type { DesignTokens, ElevationValue } from './tokens.js';
import type { SurfaceType, RadiusPattern, BorderStyle, BorderColorSource, ElevationStyle, TypographyHierarchy, TextDecoration, LabelStyle, HeadingColor, ColorScheme, ColorWeight, AccentApplication, ColoredSurfaceLayers, LayerBackground, GradientConfig, IconIdentity, ImageIdentity } from './identity/index.js';
import { deriveDna } from './dna.js';

export interface DesignTokenResolved {
  colors: {
    primary: string; primaryLight: string; primaryDark: string;
    accent: string; accentLight: string;
    surface: string; background: string;
    text: string; textMuted: string; border: string;
    error: string; success: string; warning: string;
  };
  shape: { radius: { none: number; sm: number; md: number; lg: number; xl: number; full: number } };
  typography: {
    fontFamily: { base: string; heading: string; mono: string };
    scale: Record<string, { fontSize: number; lineHeight: number }>;
    weight: { normal: number; medium: number; semibold: number; bold: number };
    letterSpacing: number;
    headingLetterSpacing: number;
  };
  spacing: { unit: number; scale: { xs: number; sm: number; md: number; lg: number; xl: number; '2xl': number } };
  elevation: { none: ElevationValue; sm: ElevationValue; md: ElevationValue; lg: ElevationValue; xl: ElevationValue };
  motion: {
    duration: { fast: number; normal: number; slow: number };
    easing: { default: string; enter: string; exit: string };
    spring: { damping: number; stiffness: number; mass: number };
    stagger: number;
  };
  opacity: { disabled: number; pressed: number; backdrop: number; muted: number };
  identity: {
    surface: SurfaceType;
    radiusPattern: RadiusPattern;
    borderWidth: number;
    borderStyle: BorderStyle;
    borderColor: BorderColorSource;
    elevationStyle: ElevationStyle;
    elevationColor: 'dark' | 'primary' | 'accent';
    overrideSurfaceBorders: boolean;
    overrideInputButtons: boolean;
    typographyHierarchy: TypographyHierarchy;
    textDecoration: TextDecoration | TextDecoration[];
    labelStyle: LabelStyle;
    headingColor: HeadingColor;
    depth: number;
    shadowAngle: number;
    colorScheme: ColorScheme;
    colorWeight: ColorWeight;
    accentApplication: AccentApplication;
    coloredSurfaceLayers: ColoredSurfaceLayers;
    // Phase 4
    background: LayerBackground;
    gradients: GradientConfig;
    icons: IconIdentity;
    images: ImageIdentity;
  };
}

export const DEFAULTS: DesignTokenResolved = {
  colors: {
    primary: '#6366f1', primaryLight: '#a5b4fc', primaryDark: '#4338ca',
    accent: '#f59e0b', accentLight: '#fcd34d',
    surface: '#ffffff', background: '#f8fafc',
    text: '#0f172a', textMuted: '#64748b', border: '#d1d5db',
    error: '#ef4444', success: '#22c55e', warning: '#f59e0b',
  },
  shape: { radius: { none: 0, sm: 4, md: 8, lg: 16, xl: 24, full: 9999 } },
  typography: {
    fontFamily: { base: "'Inter', sans-serif", heading: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" },
    scale: {
      xs: { fontSize: 12, lineHeight: 16 }, sm: { fontSize: 14, lineHeight: 20 },
      md: { fontSize: 16, lineHeight: 24 }, lg: { fontSize: 20, lineHeight: 28 },
      xl: { fontSize: 24, lineHeight: 32 }, '2xl': { fontSize: 32, lineHeight: 40 },
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    letterSpacing: 0,
    headingLetterSpacing: 0,
  },
  spacing: { unit: 4, scale: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 } },
  elevation: {
    none: { shadowOffset: [0, 0], shadowRadius: 0, shadowOpacity: 0, shadowColor: '#000000' },
    sm: { shadowOffset: [0, 1], shadowRadius: 3, shadowOpacity: 0.1, shadowColor: '#000000' },
    md: { shadowOffset: [0, 4], shadowRadius: 12, shadowOpacity: 0.15, shadowColor: '#000000' },
    lg: { shadowOffset: [0, 12], shadowRadius: 32, shadowOpacity: 0.2, shadowColor: '#000000' },
    xl: { shadowOffset: [0, 20], shadowRadius: 60, shadowOpacity: 0.3, shadowColor: '#000000' },
  },
  motion: {
    duration: { fast: 150, normal: 250, slow: 400 },
    easing: { default: 'ease-out', enter: 'ease-out', exit: 'ease-in' },
    spring: { damping: 20, stiffness: 100, mass: 1 },
    stagger: 0.06,
  },
  opacity: { disabled: 0.4, pressed: 0.85, backdrop: 0.5, muted: 0.7 },
  identity: {
    surface: 'elevated' as SurfaceType,
    radiusPattern: 'all' as RadiusPattern,
    borderWidth: 1,
    borderStyle: 'solid' as BorderStyle,
    borderColor: 'neutral' as BorderColorSource,
    elevationStyle: 'diffuse' as ElevationStyle,
    elevationColor: 'dark' as const,
    overrideSurfaceBorders: false,
    overrideInputButtons: false,
    typographyHierarchy: 'dramatic' as TypographyHierarchy,
    textDecoration: [] as TextDecoration[],
    labelStyle: 'normal' as LabelStyle,
    headingColor: 'default' as HeadingColor,
    depth: 0.5,
    shadowAngle: 0,
    colorScheme: 'light-surface' as ColorScheme,
    colorWeight: 'monochrome' as ColorWeight,
    accentApplication: {
      buttons: false,
      navItems: false,
      cardLine: [] as ('top' | 'left' | 'bottom' | 'right')[],
      links: false,
      backgrounds: false,
      iconContainers: false,
    },
    coloredSurfaceLayers: { background: 25, surface: 45, primitive: 65 },
    // Phase 4 / Plan 3 Task 21 — LayerBackground default is an empty object
    // (no color, no layers). MythikRenderer short-circuits on empty shape
    // so no positioned wrapper mounts until a consumer provides color/layers.
    background: {} as LayerBackground,
    gradients: { buttons: false, cards: false, headers: false, text: false } as GradientConfig,
    icons: { weight: 'regular' as const, container: 'none' as const, containerColor: 'primary' as const } as IconIdentity,
    images: { corners: 'rounded' as const, overlay: 'none' as const, border: false } as ImageIdentity,
  },
};

export function deepMergeTokens(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value) &&
        typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
      result[key] = deepMergeTokens(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Three-layer token resolution:
 * 1. Framework DEFAULTS (always present)
 * 2. DNA derivation (if dna seed exists)
 * 3. Manual overrides (explicit values in tokens)
 */
export function resolveDeepTokens(tokens: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!tokens || Object.keys(tokens).length === 0) {
    return DEFAULTS as unknown as Record<string, unknown>;
  }

  let base: Record<string, unknown> = DEFAULTS as unknown as Record<string, unknown>;

  // Layer 2: DNA derivation
  const dna = tokens.dna as DesignTokens['dna'];
  if (dna?.primary) {
    const derived = deriveDna(dna) as unknown as Record<string, unknown>;
    base = deepMergeTokens(base, derived);
  }

  // Layer 3: Manual overrides (everything except dna)
  const manualOverrides: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (key === 'dna') continue;
    manualOverrides[key] = value;
  }

  if (Object.keys(manualOverrides).length > 0) {
    base = deepMergeTokens(base, manualOverrides);
  }

  return base;
}
