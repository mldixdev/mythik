// Forge Identity System — Color System
import { generateTonalStep } from '../palette.js';
import type { ColorScheme, SchemeColors, ColorWeight, ColorWeightColors, ColorWeightResult, ColoredSurfaceLayers } from './types.js';

export const COLORED_SURFACE_DEFAULTS: Readonly<ColoredSurfaceLayers> = Object.freeze({
  background: 25,
  surface: 45,
  primitive: 65,
});

/** Convert hex color to rgba string */
export function hexToRgba(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const FALLBACK_DARK: Partial<SchemeColors> = {
  surface: '#1e293b', background: '#0f172a',
  text: '#e2e8f0', textMuted: '#94a3b8', border: '#334155',
};

export function resolveColorWeight(weight: ColorWeight, colors: ColorWeightColors, darkColors?: ColorWeightColors): ColorWeightResult {
  switch (weight) {
    case 'monochrome':
      return { navBg: colors.surface, navText: colors.text, sectionBg: colors.background, heroBg: 'transparent', heroGradient: 'none' };
    case 'branded-nav':
      return { navBg: colors.primary, navText: '#ffffff', sectionBg: colors.background, heroBg: 'transparent', heroGradient: 'none' };
    case 'gradient-hero':
      return {
        navBg: colors.surface, navText: colors.text, sectionBg: colors.background,
        heroBg: colors.primary,
        heroGradient: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
      };
    case 'ambient':
      return {
        navBg: colors.surface, navText: colors.text,
        sectionBg: hexToRgba(colors.primary, 0.04),
        heroBg: 'transparent', heroGradient: 'none',
      };
    case 'dark-native': {
      const dark = darkColors ?? { surface: '#1e293b', background: '#0f172a', text: '#e2e8f0', border: '#334155', primary: colors.primary, accent: colors.accent };
      return { navBg: dark.surface, navText: dark.text, sectionBg: colors.background, heroBg: 'transparent', heroGradient: 'none' };
    }
  }
}

/** Remap colors by scheme polarity — call BEFORE resolveSurfaceStyles */
export function resolveSchemeColors(scheme: ColorScheme, colors: SchemeColors, darkColors?: SchemeColors, layers?: ColoredSurfaceLayers): SchemeColors {
  switch (scheme) {
    case 'light-surface':
      return colors;
    case 'dark-surface':
      return darkColors ?? { ...colors, ...FALLBACK_DARK };
    case 'colored-surface': {
      const l = layers ?? COLORED_SURFACE_DEFAULTS;
      return {
        ...colors,
        background: generateTonalStep(colors.primary, l.background),
        surface: generateTonalStep(colors.primary, l.surface),
        border: generateTonalStep(colors.primary, Math.min(l.primitive + 10, 80)),
        text: '#ffffff',
        textMuted: '#ffffffb3',
      };
    }
  }
}
