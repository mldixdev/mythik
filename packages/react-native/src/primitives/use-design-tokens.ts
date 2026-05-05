/**
 * Extract ALL design token categories from _tokens prop.
 * Primitives call this to get typed, defaulted values for every visual dimension.
 * Replaces useThemeColors (which only extracted 6 color values).
 *
 * RN-specific: elevation returns native shadow prop objects.
 */
import { surfaceToRN, resolveIdentity, DEFAULTS, applyBorderElevationRN } from 'mythik';
import type { RNSurfaceStyleProps, RNSurfaceStyles } from 'mythik';
import type { SurfaceType, RadiusPattern, BorderStyle, BorderColorSource, ElevationStyle, TypographyHierarchy, TextDecoration, LabelStyle, HeadingColor, ColorScheme, ColorWeight, AccentApplication, ColorWeightResult, IdentityConfig, LayerBackground, GradientConfig, IconIdentity, ImageIdentity } from 'mythik';

export type { RNSurfaceStyleProps, RNSurfaceStyles };

export interface RNShadow {
  shadowOffset: { width: number; height: number };
  shadowRadius: number;
  shadowOpacity: number;
  shadowColor: string;
}

export interface DesignTokensRN {
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
    weight: { normal: string; medium: string; semibold: string; bold: string };
    letterSpacing: number;
    headingLetterSpacing: number;
  };
  spacing: { unit: number; scale: Record<string, number> };
  elevation: { none: RNShadow; sm: RNShadow; md: RNShadow; lg: RNShadow; xl: RNShadow };
  motion: {
    duration: { fast: number; normal: number; slow: number };
    easing: { default: string; enter: string; exit: string };
    spring: { damping: number; stiffness: number; mass: number };
    stagger: number;
  };
  opacity: { disabled: number; pressed: number; backdrop: number; muted: number };
  surface: RNSurfaceStyles;
  identity: {
    surface: SurfaceType;
    radiusPattern: RadiusPattern;
    borderWidth: number;
    borderStyle: BorderStyle;
    elevationStyle: ElevationStyle;
    typographyHierarchy: TypographyHierarchy;
    textDecoration: TextDecoration | TextDecoration[];
    labelStyle: LabelStyle;
    depth: number;
    shadowAngle: number;
    colorScheme: ColorScheme;
    colorWeight: ColorWeight;
    accentApplication: AccentApplication;
  };
  colorWeight: ColorWeightResult;
}

// Defaults derived from core DEFAULTS — single source of truth
const D = DEFAULTS;
// RN uses bare font names (no CSS fallback chain)
const RN_FONT_FAMILY = { base: 'Inter', heading: 'Inter', mono: 'JetBrains Mono' };

function elevToRN(e: { shadowOffset: [number, number]; shadowRadius: number; shadowOpacity: number; shadowColor: string }): RNShadow {
  return {
    shadowOffset: { width: e.shadowOffset[0], height: e.shadowOffset[1] },
    shadowRadius: e.shadowRadius,
    shadowOpacity: e.shadowOpacity,
    shadowColor: e.shadowColor,
  };
}

function get<T>(obj: Record<string, unknown> | undefined, path: string, fallback: T): T {
  if (!obj) return fallback;
  const segments = path.split('.');
  let current: unknown = obj;
  for (const seg of segments) {
    if (current === null || current === undefined || typeof current !== 'object') return fallback;
    current = (current as Record<string, unknown>)[seg];
  }
  return (current as T) ?? fallback;
}

export function useDesignTokens(tokens: Record<string, unknown> | undefined): DesignTokensRN {
  const c = (tokens?.colors ?? {}) as Record<string, string>;
  const sr = get<Record<string, number>>(tokens, 'shape.radius', {});
  const tf = get<Record<string, string>>(tokens, 'typography.fontFamily', {});
  const ts = get<Record<string, { fontSize: number; lineHeight: number }>>(tokens, 'typography.scale', {});
  const tw = get<Record<string, number>>(tokens, 'typography.weight', {});
  const sp = (tokens?.spacing ?? {}) as Record<string, unknown>;
  const ss = (sp.scale ?? {}) as Record<string, number>;
  const el = (tokens?.elevation ?? {}) as Record<string, { shadowOffset: [number, number]; shadowRadius: number; shadowOpacity: number; shadowColor: string }>;
  const op = (tokens?.opacity ?? {}) as Record<string, number>;

  // Build identity config from tokens
  const identityConfig: IdentityConfig = {
    surface: get<SurfaceType>(tokens, 'identity.surface', 'elevated'),
    radiusPattern: get<RadiusPattern>(tokens, 'identity.radiusPattern', 'all'),
    depth: get<number>(tokens, 'identity.depth', D.identity.depth),
    shadowAngle: get<number>(tokens, 'identity.shadowAngle', D.identity.shadowAngle),
    colorScheme: get<ColorScheme>(tokens, 'identity.colorScheme', D.identity.colorScheme),
    colorWeight: get<ColorWeight>(tokens, 'identity.colorWeight', D.identity.colorWeight),
    accentApplication: {
      buttons: get<boolean>(tokens, 'identity.accentApplication.buttons', false),
      navItems: get<boolean>(tokens, 'identity.accentApplication.navItems', false),
      cardLine: get<('top' | 'left' | 'bottom' | 'right')[]>(tokens, 'identity.accentApplication.cardLine', []),
      links: get<boolean>(tokens, 'identity.accentApplication.links', false),
      backgrounds: get<boolean>(tokens, 'identity.accentApplication.backgrounds', false),
      iconContainers: get<boolean>(tokens, 'identity.accentApplication.iconContainers', false),
    },
    coloredSurfaceLayers: get<ColorScheme>(tokens, 'identity.colorScheme', D.identity.colorScheme) === 'colored-surface'
      ? {
          background: get<number>(tokens, 'identity.coloredSurfaceLayers.background', 25),
          surface: get<number>(tokens, 'identity.coloredSurfaceLayers.surface', 45),
          primitive: get<number>(tokens, 'identity.coloredSurfaceLayers.primitive', 65),
        }
      : undefined,
    borderWidth: get<number>(tokens, 'identity.borderWidth', D.identity.borderWidth) as 0 | 1 | 2 | 3,
    borderStyle: get<BorderStyle>(tokens, 'identity.borderStyle', D.identity.borderStyle),
    borderColor: get<BorderColorSource>(tokens, 'identity.borderColor', D.identity.borderColor),
    elevationStyle: get<ElevationStyle>(tokens, 'identity.elevationStyle', D.identity.elevationStyle),
    elevationColor: get<string>(tokens, 'identity.elevationColor', D.identity.elevationColor) as 'dark' | 'primary' | 'accent',
    overrideSurfaceBorders: get<boolean>(tokens, 'identity.overrideSurfaceBorders', false),
    overrideInputButtons: get<boolean>(tokens, 'identity.overrideInputButtons', false),
    typographyHierarchy: get<TypographyHierarchy>(tokens, 'identity.typographyHierarchy', D.identity.typographyHierarchy),
    textDecoration: get<TextDecoration | TextDecoration[]>(tokens, 'identity.textDecoration', D.identity.textDecoration),
    labelStyle: get<LabelStyle>(tokens, 'identity.labelStyle', D.identity.labelStyle),
    headingColor: get<HeadingColor>(tokens, 'identity.headingColor', D.identity.headingColor),
    // Phase 4 / plan 3 Task 21 — LayerBackground replaces legacy. Undefined
    // keys omitted (mirrors web sibling I2 fix) — prevents `isLayerBackground`
    // key-presence check from accepting an all-undefined payload.
    background: (() => {
      const bgColor = get<string | undefined>(tokens, 'identity.background.color', undefined as unknown as string);
      const bgLayers = get<LayerBackground['layers']>(tokens, 'identity.background.layers', undefined as unknown as LayerBackground['layers']);
      const bg: LayerBackground = {};
      if (bgColor !== undefined) bg.color = bgColor;
      if (bgLayers !== undefined) bg.layers = bgLayers;
      return bg;
    })(),
    gradients: {
      buttons: get<boolean>(tokens, 'identity.gradients.buttons', false),
      cards: get<boolean>(tokens, 'identity.gradients.cards', false),
      headers: get<boolean>(tokens, 'identity.gradients.headers', false),
      text: get<boolean>(tokens, 'identity.gradients.text', false),
    },
    icons: {
      weight: get<string>(tokens, 'identity.icons.weight', 'regular') as IconIdentity['weight'],
      container: get<string>(tokens, 'identity.icons.container', 'none') as IconIdentity['container'],
      containerColor: get<string>(tokens, 'identity.icons.containerColor', 'primary') as IconIdentity['containerColor'],
    },
    images: {
      corners: get<string>(tokens, 'identity.images.corners', 'rounded') as ImageIdentity['corners'],
      overlay: get<string>(tokens, 'identity.images.overlay', 'none') as ImageIdentity['overlay'],
      border: get<boolean>(tokens, 'identity.images.border', false),
    },
  };

  // Build full color sets
  const fullColors = {
    primary: c.primary ?? D.colors.primary, primaryLight: c.primaryLight ?? D.colors.primaryLight,
    primaryDark: c.primaryDark ?? D.colors.primaryDark, accent: c.accent ?? D.colors.accent,
    accentLight: c.accentLight ?? D.colors.accentLight, surface: c.surface ?? D.colors.surface,
    background: c.background ?? D.colors.background, text: c.text ?? D.colors.text,
    textMuted: c.textMuted ?? D.colors.textMuted, border: c.border ?? D.colors.border,
    error: c.error ?? D.colors.error, success: c.success ?? D.colors.success,
    warning: c.warning ?? D.colors.warning,
  };
  const dc = get<Record<string, string>>(tokens, 'modes.dark.colors', undefined as unknown as Record<string, string>);
  const fullDark = dc ? {
    primary: dc.primary ?? fullColors.primary, primaryLight: dc.primaryLight ?? fullColors.primaryLight,
    primaryDark: dc.primaryDark ?? fullColors.primaryDark, accent: dc.accent ?? fullColors.accent,
    accentLight: dc.accentLight ?? fullColors.accentLight, surface: dc.surface ?? fullColors.surface,
    background: dc.background ?? fullColors.background, text: dc.text ?? fullColors.text,
    textMuted: dc.textMuted ?? fullColors.textMuted, border: dc.border ?? fullColors.border,
    error: dc.error ?? fullColors.error, success: dc.success ?? fullColors.success,
    warning: dc.warning ?? fullColors.warning,
  } : undefined;

  // Resolve all identity in one call
  const { schemeColors, surface: rawSurface, colorWeight: colorWeightResult, radius } = resolveIdentity(
    { colors: fullColors, darkColors: fullDark, identity: identityConfig },
    surfaceToRN
  );

  // Apply border/elevation identity overrides only when explicitly enabled
  const overrideCardModal = identityConfig.overrideSurfaceBorders ?? false;
  const overrideInputBtns = identityConfig.overrideInputButtons ?? false;
  let surface = rawSurface;
  if (overrideCardModal || overrideInputBtns) {
    const resolvedBorderColor =
      identityConfig.borderColor === 'primary' ? schemeColors.primary
      : identityConfig.borderColor === 'accent' ? schemeColors.accent
      : identityConfig.borderColor === 'text' ? schemeColors.text
      : schemeColors.border;

    const resolvedElevationColor =
      identityConfig.elevationColor === 'primary' ? schemeColors.primary
      : identityConfig.elevationColor === 'accent' ? schemeColors.accent
      : '#000000';

    surface = applyBorderElevationRN(rawSurface, {
      borderWidth: identityConfig.borderWidth ?? D.identity.borderWidth,
      borderStyle: identityConfig.borderStyle ?? D.identity.borderStyle,
      borderColor: resolvedBorderColor,
      elevationStyle: identityConfig.elevationStyle ?? D.identity.elevationStyle,
      elevationColor: resolvedElevationColor,
      depth: identityConfig.depth ?? D.identity.depth,
      shadowAngle: identityConfig.shadowAngle ?? D.identity.shadowAngle,
      slots: { cardModal: overrideCardModal, inputButtons: overrideInputBtns },
    });
  }

  const identity = {
    surface: identityConfig.surface!,
    radiusPattern: identityConfig.radiusPattern!,
    borderWidth: identityConfig.borderWidth!,
    borderStyle: identityConfig.borderStyle!,
    borderColor: identityConfig.borderColor ?? D.identity.borderColor,
    elevationStyle: identityConfig.elevationStyle!,
    elevationColor: identityConfig.elevationColor ?? D.identity.elevationColor,
    overrideSurfaceBorders: overrideCardModal,
    overrideInputButtons: overrideInputBtns,
    typographyHierarchy: identityConfig.typographyHierarchy!,
    textDecoration: identityConfig.textDecoration!,
    labelStyle: identityConfig.labelStyle!,
    headingColor: identityConfig.headingColor ?? D.identity.headingColor,
    depth: identityConfig.depth!,
    shadowAngle: identityConfig.shadowAngle!,
    colorScheme: identityConfig.colorScheme!,
    colorWeight: identityConfig.colorWeight!,
    accentApplication: identityConfig.accentApplication!,
    // Phase 4
    background: identityConfig.background!,
    gradients: identityConfig.gradients!,
    icons: identityConfig.icons!,
    images: identityConfig.images!,
  };

  return {
    colors: {
      primary: schemeColors.primary, primaryLight: schemeColors.primaryLight,
      primaryDark: schemeColors.primaryDark, accent: schemeColors.accent,
      accentLight: schemeColors.accentLight, surface: schemeColors.surface,
      background: schemeColors.background, text: schemeColors.text,
      textMuted: schemeColors.textMuted, border: schemeColors.border,
      error: schemeColors.error, success: schemeColors.success,
      warning: schemeColors.warning,
    },
    shape: { radius: {
      none: sr.none ?? D.shape.radius.none, sm: sr.sm ?? D.shape.radius.sm, md: sr.md ?? D.shape.radius.md,
      lg: sr.lg ?? D.shape.radius.lg, xl: sr.xl ?? D.shape.radius.xl, full: sr.full ?? D.shape.radius.full,
    } },
    typography: {
      fontFamily: {
        base: tf.base ?? RN_FONT_FAMILY.base, heading: tf.heading ?? RN_FONT_FAMILY.heading,
        mono: tf.mono ?? RN_FONT_FAMILY.mono,
      },
      scale: {
        xs: ts.xs ?? D.typography.scale.xs, sm: ts.sm ?? D.typography.scale.sm, md: ts.md ?? D.typography.scale.md,
        lg: ts.lg ?? D.typography.scale.lg, xl: ts.xl ?? D.typography.scale.xl, '2xl': ts['2xl'] ?? D.typography.scale['2xl'],
      },
      weight: {
        normal: String(tw.normal ?? D.typography.weight.normal),
        medium: String(tw.medium ?? D.typography.weight.medium),
        semibold: String(tw.semibold ?? D.typography.weight.semibold),
        bold: String(tw.bold ?? D.typography.weight.bold),
      },
      letterSpacing: get(tokens, 'typography.letterSpacing', D.typography.letterSpacing),
      headingLetterSpacing: get(tokens, 'typography.headingLetterSpacing', D.typography.headingLetterSpacing),
    },
    spacing: {
      unit: (sp.unit as number) ?? D.spacing.unit,
      scale: {
        xs: ss.xs ?? D.spacing.scale.xs, sm: ss.sm ?? D.spacing.scale.sm, md: ss.md ?? D.spacing.scale.md,
        lg: ss.lg ?? D.spacing.scale.lg, xl: ss.xl ?? D.spacing.scale.xl, '2xl': ss['2xl'] ?? D.spacing.scale['2xl'],
      },
    },
    elevation: {
      none: elevToRN(el.none ?? D.elevation.none), sm: elevToRN(el.sm ?? D.elevation.sm),
      md: elevToRN(el.md ?? D.elevation.md), lg: elevToRN(el.lg ?? D.elevation.lg),
      xl: elevToRN(el.xl ?? D.elevation.xl),
    },
    motion: {
      duration: {
        fast: get(tokens, 'motion.duration.fast', D.motion.duration.fast),
        normal: get(tokens, 'motion.duration.normal', D.motion.duration.normal),
        slow: get(tokens, 'motion.duration.slow', D.motion.duration.slow),
      },
      easing: {
        default: get(tokens, 'motion.easing.default', D.motion.easing.default),
        enter: get(tokens, 'motion.easing.enter', D.motion.easing.enter),
        exit: get(tokens, 'motion.easing.exit', D.motion.easing.exit),
      },
      spring: {
        damping: get(tokens, 'motion.spring.damping', D.motion.spring.damping),
        stiffness: get(tokens, 'motion.spring.stiffness', D.motion.spring.stiffness),
        mass: get(tokens, 'motion.spring.mass', D.motion.spring.mass),
      },
      stagger: get(tokens, 'motion.stagger', D.motion.stagger),
    },
    opacity: {
      disabled: op.disabled ?? D.opacity.disabled, pressed: op.pressed ?? D.opacity.pressed,
      backdrop: op.backdrop ?? D.opacity.backdrop, muted: op.muted ?? D.opacity.muted,
    },
    surface,
    identity,
    colorWeight: colorWeightResult,
  };
}
