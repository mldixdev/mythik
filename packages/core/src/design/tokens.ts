import type { IdentityConfig } from './identity/index.js';

// --- Deep Design Token Types ---

export interface DnaSeed {
  primary: string;
  harmony?: 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
  accent?: string;
  neutral?: 'warm' | 'cool' | 'natural';
  roundness?: number;
  density?: number;
  depth?: number;
  motion?: 'fluid' | 'snappy' | 'gentle' | 'energetic';
  formality?: number;
}

export interface ElevationValue {
  shadowOffset: [number, number];
  shadowRadius: number;
  shadowOpacity: number;
  shadowColor: string;
}

export interface TypographyScale {
  fontSize: number;
  lineHeight: number;
}

export interface DesignTokens {
  dna?: DnaSeed;
  colors?: Record<string, string>;
  shape?: { radius?: Record<string, number> };
  typography?: {
    fontFamily?: Record<string, string>;
    scale?: Record<string, TypographyScale>;
    weight?: Record<string, number>;
    letterSpacing?: number;
    headingLetterSpacing?: number;
  };
  spacing?: { unit?: number; scale?: Record<string, number> };
  elevation?: Record<string, ElevationValue>;
  motion?: {
    duration?: Record<string, number>;
    easing?: Record<string, string>;
    spring?: { damping: number; stiffness: number; mass: number };
    stagger?: number;
  };
  opacity?: Record<string, number>;
  identity?: IdentityConfig;
  components?: Record<string, Record<string, Record<string, unknown>>>;
  modes?: Record<string, Partial<DesignTokens>>;
  // Deprecated — kept for backward compat
  radius?: Record<string, number>;
  shadow?: Record<string, string>;
  borders?: Record<string, string>;
  breakpoints?: Record<string, number>;
  animations?: Record<string, unknown>;
}

/**
 * Resolve tokens with mode support.
 * If modes are defined and an activeMode is specified,
 * mode-specific tokens override base tokens.
 */
export function resolveTokens(
  baseTokens: DesignTokens,
  activeMode?: string,
): Record<string, unknown> {
  if (!activeMode || !baseTokens.modes || !baseTokens.modes[activeMode]) {
    return baseTokens as unknown as Record<string, unknown>;
  }

  const modeOverrides = baseTokens.modes[activeMode];
  return deepMerge(baseTokens as unknown as Record<string, unknown>, modeOverrides as unknown as Record<string, unknown>);
}

/**
 * Deep merge two objects. Mode overrides win over base.
 * Does NOT merge the 'modes' key itself to avoid circular reference.
 */
function deepMerge(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    if (key === 'modes') continue; // Don't merge modes recursively

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}
