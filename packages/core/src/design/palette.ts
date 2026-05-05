import { hexToOklch, oklchToHex } from './oklch.js';

const TONE_STOPS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100] as const;

export type TonalPalette = Record<string, string>;

/**
 * Generate a 13-stop tonal palette from a hex color.
 * Each stop maps a "tone" (0-100 lightness) to a hex color
 * at the same hue and chroma (clamped to sRGB gamut).
 */
/** Generate a single tonal color at any lightness step (0-100). */
export function generateTonalStep(hex: string, step: number): string {
  if (step === 100) return '#ffffff';
  const [, C, H] = hexToOklch(hex);
  const L = step / 100;
  const chromaScale = step <= 10 ? step / 10 : step >= 90 ? (100 - step) / 10 : 1;
  const adjustedC = C * Math.min(1, chromaScale);
  return oklchToHex(L, adjustedC, H);
}

export function generateTonalPalette(hex: string): TonalPalette {
  const [, C, H] = hexToOklch(hex);
  const palette: TonalPalette = {};

  for (const tone of TONE_STOPS) {
    if (tone === 100) {
      palette['100'] = '#ffffff';
      continue;
    }
    const L = tone / 100;
    // Reduce chroma at extremonth to stay in gamut
    const chromaScale = tone <= 10 ? tone / 10 : tone >= 90 ? (100 - tone) / 10 : 1;
    const adjustedC = C * Math.min(1, chromaScale);
    palette[String(tone)] = oklchToHex(L, adjustedC, H);
  }

  return palette;
}

/**
 * Generate semantic colors (error, success, warning) matching
 * the chroma character of a primary color.
 */
export function generateSemanticColors(primaryHex: string): { error: string; success: string; warning: string } {
  const [, C] = hexToOklch(primaryHex);
  const chroma = Math.min(C, 0.2);
  return {
    error: oklchToHex(0.6, chroma, 25),
    success: oklchToHex(0.6, chroma, 145),
    warning: oklchToHex(0.6, chroma, 85),
  };
}

/**
 * Generate a neutral palette with subtle tint.
 * "warm" → tint toward primary hue
 * "cool" → tint toward blue (250°)
 * "natural" → tint from primary at minimal chroma
 */
export function generateNeutralPalette(
  primaryHex: string,
  mode: 'warm' | 'cool' | 'natural',
): TonalPalette {
  const [, , primaryHue] = hexToOklch(primaryHex);
  // Each mode gets its own hue and chroma intensity
  // warm → amber/orange (~55°), cool → blue (~250°), natural → primary tint
  const hue = mode === 'cool' ? 250 : mode === 'warm' ? 55 : primaryHue;
  // Chroma strong enough to be visible in backgrounds and borders
  const neutralChroma = mode === 'natural' ? 0.025 : 0.035;

  const palette: TonalPalette = {};
  for (const tone of TONE_STOPS) {
    if (tone === 100) {
      palette['100'] = '#ffffff';
      continue;
    }
    const L = tone / 100;
    // More tint in midtones, less at extremonth (avoids tinted pure black/white)
    const chromaScale = tone <= 10 ? tone / 10 : tone >= 90 ? (100 - tone) / 10 : 1;
    palette[String(tone)] = oklchToHex(L, neutralChroma * chromaScale, hue);
  }

  return palette;
}
