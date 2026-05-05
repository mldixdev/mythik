import type { SchemeColors, IdentityConfig, ColorWeightResult, StructuredSurfaceStyles } from './identity/index.js';
import { resolveSchemeColors, resolveSurfaceStyles, resolveColorWeight, resolveRadiusPattern, COLORED_SURFACE_DEFAULTS } from './identity/index.js';
import { generateTonalStep } from './palette.js';

export interface ResolveIdentityInput {
  colors: SchemeColors;
  darkColors?: SchemeColors;
  identity: IdentityConfig;
}

export interface ResolvedIdentity<TSurface> {
  schemeColors: SchemeColors;
  surface: TSurface;
  colorWeight: ColorWeightResult;
  radius: (base: number) => string;
}

export type SurfaceSerializer<T> = (
  raw: StructuredSurfaceStyles,
  depth: number,
  shadowAngle: number
) => T;

export function resolveIdentity<T>(
  input: ResolveIdentityInput,
  serializer: SurfaceSerializer<T>
): ResolvedIdentity<T> {
  const { colors, darkColors, identity: id } = input;

  const colorScheme = id.colorScheme ?? 'light-surface';
  const surfaceType = id.surface ?? 'elevated';
  const depth = id.depth ?? 0.5;
  const shadowAngle = id.shadowAngle ?? 0;
  const colorWeight = id.colorWeight ?? 'monochrome';
  const radiusPattern = id.radiusPattern ?? 'all';
  const accentApp = id.accentApplication ?? {};

  const coloredLayers = colorScheme === 'colored-surface'
    ? {
        background: id.coloredSurfaceLayers?.background ?? COLORED_SURFACE_DEFAULTS.background,
        surface: id.coloredSurfaceLayers?.surface ?? COLORED_SURFACE_DEFAULTS.surface,
        primitive: id.coloredSurfaceLayers?.primitive ?? COLORED_SURFACE_DEFAULTS.primitive,
      }
    : undefined;

  const schemeColors = resolveSchemeColors(colorScheme, colors, darkColors, coloredLayers);

  const inputSurface = coloredLayers
    ? generateTonalStep(colors.primary, coloredLayers.primitive)
    : undefined;

  const surfaceColors = {
    primary: schemeColors.primary,
    surface: schemeColors.surface,
    background: schemeColors.background,
    border: schemeColors.border,
    text: schemeColors.text,
    ...(inputSurface ? { inputSurface } : {}),
  };
  const rawSurface = resolveSurfaceStyles(surfaceType, surfaceColors, {
    accent: schemeColors.accent,
    cardLine: accentApp.cardLine,
    accentButtons: accentApp.buttons,
    focusColor: colorScheme === 'colored-surface' ? schemeColors.accent : undefined,
  });

  const surface = serializer(rawSurface, depth, shadowAngle);

  const cwColors = {
    primary: schemeColors.primary, accent: schemeColors.accent,
    surface: schemeColors.surface, background: schemeColors.background,
    text: schemeColors.text, border: schemeColors.border,
  };
  const cwDark = darkColors ? {
    primary: darkColors.primary, accent: darkColors.accent,
    surface: darkColors.surface, background: darkColors.background,
    text: darkColors.text, border: darkColors.border,
  } : undefined;
  const colorWeightResult = resolveColorWeight(colorWeight, cwColors, cwDark);

  const radius = (base: number) => resolveRadiusPattern(radiusPattern, base);

  return { schemeColors, surface, colorWeight: colorWeightResult, radius };
}
