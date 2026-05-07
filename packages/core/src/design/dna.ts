import type { DnaSeed, DesignTokens, ElevationValue } from './tokens.js';
import { hexToOklch, oklchToHex } from './oklch.js';
import { generateTonalPalette, generateSemanticColors, generateNeutralPalette } from './palette.js';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function roundTo(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function normalizeDnaNumericSeed(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number') return fallback;
  return value > 1 ? value / 100 : value;
}

const HARMONY_OFFSETS: Record<string, number> = {
  complementary: 180,
  analogous: 50,
  triadic: 120,
  'split-complementary': 150,
};

const MOTION_PRESETS: Record<string, {
  duration: { fast: number; normal: number; slow: number };
  spring: { damping: number; stiffness: number; mass: number };
  stagger: number;
  easing: string;
}> = {
  fluid:     { duration: { fast: 200, normal: 350, slow: 500 }, spring: { damping: 15, stiffness: 80, mass: 1 },  stagger: 0.08, easing: 'ease-in-out' },
  snappy:    { duration: { fast: 100, normal: 180, slow: 280 }, spring: { damping: 25, stiffness: 300, mass: 1 }, stagger: 0.04, easing: 'ease-out' },
  gentle:    { duration: { fast: 250, normal: 400, slow: 600 }, spring: { damping: 20, stiffness: 60, mass: 1 },  stagger: 0.10, easing: 'ease' },
  energetic: { duration: { fast: 120, normal: 220, slow: 350 }, spring: { damping: 10, stiffness: 200, mass: 1 }, stagger: 0.05, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
};

/**
 * Derive a full DesignTokens object from a DnaSeed.
 * Uses OKLCH color math for perceptually uniform palette generation.
 */
export function deriveDna(seed: DnaSeed): DesignTokens {
  const roundness = normalizeDnaNumericSeed(seed.roundness, 0.5);
  const density = normalizeDnaNumericSeed(seed.density, 0.5);
  const depth = normalizeDnaNumericSeed(seed.depth, 0.5);
  const motionPreset = seed.motion ?? 'gentle';
  const formality = normalizeDnaNumericSeed(seed.formality, 0.5);
  const harmony = seed.harmony ?? 'complementary';
  const neutralMode = seed.neutral ?? 'natural';

  // --- Colors ---
  // Primary = user's exact color. Variants derived relative to its natural lightness.
  const [primaryL, primaryC, primaryHue] = hexToOklch(seed.primary);
  const primaryLight = oklchToHex(Math.min(primaryL + 0.15, 0.95), primaryC * 0.85, primaryHue);
  const primaryDark = oklchToHex(Math.max(primaryL - 0.20, 0.25), primaryC * 0.9, primaryHue);
  // Tonal palette still used for dark mode and neutral generation
  const primaryPalette = generateTonalPalette(seed.primary);

  let accentHex: string;
  if (seed.accent) {
    accentHex = seed.accent;
  } else {
    const hueOffset = HARMONY_OFFSETS[harmony] ?? 180;
    const accentHue = (primaryHue + hueOffset) % 360;
    accentHex = oklchToHex(0.6, primaryC, accentHue);
  }
  const accentPalette = generateTonalPalette(accentHex);
  const neutralPalette = generateNeutralPalette(seed.primary, neutralMode);
  const semanticColors = generateSemanticColors(seed.primary);

  const colors: Record<string, string> = {
    primary: seed.primary,
    primaryLight,
    primaryDark,
    accent: seed.accent ? seed.accent : accentPalette['60'],
    accentLight: accentPalette['80'],
    surface: neutralPalette['99'],
    background: neutralPalette['95'],
    text: neutralPalette['10'],
    textMuted: neutralPalette['40'],
    border: neutralPalette['80'],
    error: semanticColors.error,
    success: semanticColors.success,
    warning: semanticColors.warning,
  };

  // --- Shape ---
  const shape = {
    radius: {
      none: 0,
      sm: Math.round(lerp(1, 8, roundness)),
      md: Math.round(lerp(2, 16, roundness)),
      lg: Math.round(lerp(4, 24, roundness)),
      xl: Math.round(lerp(6, 32, roundness)),
      full: 9999,
    },
  };

  // --- Typography ---
  // Formality controls both discrete font families (5 tiers) and continuous properties
  // (letter-spacing, weight curve, line-height ratio) so the slider feels alive at every value.
  const BASE_FONTS: Array<[number, string]> = [
    [0.0,  "'Inter', sans-serif"],
    [0.25, "'Space Grotesk', sans-serif"],
    [0.5,  "'Source Sans 3', sans-serif"],
    [0.75, "'Lora', serif"],
    [1.0,  "'Merriweather', serif"],
  ];
  const HEADING_FONTS: Array<[number, string]> = [
    [0.0,  "'Inter', sans-serif"],
    [0.2,  "'Space Grotesk', sans-serif"],
    [0.4,  "'DM Sans', sans-serif"],
    [0.6,  "'Lora', serif"],
    [0.8,  "'Playfair Display', serif"],
  ];
  function pickFont(tiers: Array<[number, string]>, t: number): string {
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (t >= tiers[i][0]) return tiers[i][1];
    }
    return tiers[0][1];
  }

  const baseSize = Math.round(lerp(18, 14, density));
  // Continuous properties driven by formality
  const letterSpacing = roundTo(lerp(0, 0.03, formality), 3);  // em — tighter to wider
  const headingLetterSpacing = roundTo(lerp(0, -0.02, formality), 3); // headings get tighter with formality
  const lineHeightRatio = roundTo(lerp(1.45, 1.6, formality), 2); // more generous line-height as formality grows

  const typography = {
    fontFamily: {
      base: pickFont(BASE_FONTS, formality),
      heading: pickFont(HEADING_FONTS, formality),
      mono: "'JetBrains Mono', monospace",
    },
    scale: {
      xs:  { fontSize: Math.round(baseSize * 0.75), lineHeight: Math.round(baseSize * 0.75 * lineHeightRatio) },
      sm:  { fontSize: Math.round(baseSize * 0.875), lineHeight: Math.round(baseSize * 0.875 * lineHeightRatio) },
      md:  { fontSize: baseSize, lineHeight: Math.round(baseSize * lineHeightRatio) },
      lg:  { fontSize: Math.round(baseSize * 1.25), lineHeight: Math.round(baseSize * 1.25 * lineHeightRatio) },
      xl:  { fontSize: Math.round(baseSize * 1.5), lineHeight: Math.round(baseSize * 1.5 * lineHeightRatio) },
      '2xl': { fontSize: Math.round(baseSize * 2), lineHeight: Math.round(baseSize * 2 * lineHeightRatio) },
    },
    weight: {
      normal: 400,
      medium: formality > 0.6 ? 500 : 500,
      semibold: 600,
      bold: Math.round(lerp(700, 800, formality)),
    },
    letterSpacing,
    headingLetterSpacing,
  };

  // --- Spacing ---
  const unit = Math.round(lerp(6, 3, density));
  const spacing = {
    unit,
    scale: {
      xs: unit,
      sm: unit * 2,
      md: unit * 4,
      lg: unit * 6,
      xl: unit * 8,
      '2xl': unit * 12,
    },
  };

  // --- Elevation ---
  function elev(offsetY: number, radiusMin: number, radiusMax: number, opacityMax: number): ElevationValue {
    return {
      shadowOffset: [0, Math.round(lerp(0, offsetY, depth))],
      shadowRadius: Math.round(lerp(radiusMin, radiusMax, depth)),
      shadowOpacity: roundTo(lerp(0, opacityMax, depth), 2),
      shadowColor: '#000000',
    };
  }
  const elevation: Record<string, ElevationValue> = {
    none: { shadowOffset: [0, 0], shadowRadius: 0, shadowOpacity: 0, shadowColor: '#000000' },
    sm: elev(2, 1, 6, 0.15),
    md: elev(6, 2, 20, 0.25),
    lg: elev(14, 4, 44, 0.32),
    xl: elev(24, 8, 72, 0.42),
  };

  // --- Motion ---
  const mp = MOTION_PRESETS[motionPreset] ?? MOTION_PRESETS.gentle;
  const motion = {
    duration: { ...mp.duration },
    easing: { default: mp.easing, enter: 'ease-out', exit: 'ease-in' },
    spring: { ...mp.spring },
    stagger: mp.stagger,
  };

  // --- Opacity ---
  const opacity = {
    disabled: 0.4,
    pressed: roundTo(lerp(0.9, 0.8, depth), 2),
    backdrop: roundTo(lerp(0.3, 0.6, depth), 2),
    muted: roundTo(lerp(0.6, 0.75, depth), 2),
  };

  // --- Auto dark mode ---
  const darkColors: Record<string, string> = {
    primary: primaryPalette['80'],
    primaryLight: primaryPalette['90'],
    primaryDark: primaryPalette['60'],
    accent: accentPalette['80'],
    accentLight: accentPalette['90'],
    surface: neutralPalette['10'],
    background: neutralPalette['5'],
    text: neutralPalette['90'],
    textMuted: neutralPalette['60'],
    border: neutralPalette['30'],
    error: semanticColors.error,
    success: semanticColors.success,
    warning: semanticColors.warning,
  };
  const darkElevation: Record<string, Partial<ElevationValue>> = {};
  for (const [key, val] of Object.entries(elevation)) {
    if (key !== 'none') {
      darkElevation[key] = { shadowOpacity: roundTo(Math.min(val.shadowOpacity * 2.5, 1), 2) };
    }
  }

  return {
    colors,
    shape,
    typography,
    spacing,
    elevation,
    motion,
    opacity,
    modes: {
      dark: { colors: darkColors, elevation: darkElevation as Record<string, ElevationValue> },
    },
  };
}
