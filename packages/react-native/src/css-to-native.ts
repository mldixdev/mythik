import { Dimensions } from 'react-native';
import type { CssToNativeResult } from './types.js';

/** Web-only properties to strip silently (S2: expanded set) */
const IGNORED_PROPS = new Set([
  'cursor', 'userSelect', 'outline', 'outlineOffset',
  'textOverflow', 'whiteSpace', 'wordBreak',
  'backdropFilter', 'clipPath', 'filter',
  'boxSizing', 'appearance', 'transition',
  'WebkitLineClamp', 'WebkitBoxOrient',
  'float', 'clear',
  'overflowX', 'overflowY',
  'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow',
  'gridArea', 'gridGap', 'columnGap', 'rowGap',
]);

/** CSS properties that need renaming to RN equivalents (S2: textDecoration) */
const PROPERTY_RENAMES: Record<string, string> = {
  textDecoration: 'textDecorationLine',
};

/** I1: Invalidate cache on dimension changes (device rotation).
 *  Module-lifetime listener, intentionally never removed. */
Dimensions.addEventListener('change', () => {
  dimensionGeneration++;
});

/** Generation counter — incremented on Dimensions change to invalidate percentage-based caches */
let dimensionGeneration = 0;

/** Extended cache entry that tracks dimension generation */
interface CacheEntry {
  result: CssToNativeResult;
  generation: number;
  hasPercentages: boolean;
}

const cacheWithGeneration = new WeakMap<object, CacheEntry>();

/** Strip "px", "em", "rem", "vh", "vw" units from a value (I3: honest return type, I6: more units) */
function stripUnit(value: unknown): unknown {
  if (typeof value === 'string') {
    // px — direct strip
    const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/);
    if (pxMatch) return parseFloat(pxMatch[1]);

    // em/rem — approximate: 1em ≈ 16px (standard base, best effort for framework)
    const emMatch = value.match(/^(-?\d+(?:\.\d+)?)(r?em)$/);
    if (emMatch) return Math.round(parseFloat(emMatch[1]) * 16);

    // vh/vw — convert using Dimensions
    const vhMatch = value.match(/^(-?\d+(?:\.\d+)?)vh$/);
    if (vhMatch) return Math.round(parseFloat(vhMatch[1]) / 100 * Dimensions.get('window').height);

    const vwMatch = value.match(/^(-?\d+(?:\.\d+)?)vw$/);
    if (vwMatch) return Math.round(parseFloat(vwMatch[1]) / 100 * Dimensions.get('window').width);
  }
  return value;
}

/** Parse CSS boxShadow string → RN shadow props (C3: handles spread + inset) */
function parseBoxShadow(shadow: string): Record<string, unknown> {
  // Strip inset keyword — RN doesn't support inset shadows
  const cleaned = shadow.replace(/\binset\b/g, '').trim();

  // Format: "X Y blur [spread] color" — spread is optional
  const match = cleaned.match(/(-?\d+)(?:px)?\s+(-?\d+)(?:px)?\s+(-?\d+)(?:px)?(?:\s+(-?\d+)(?:px)?)?\s+(.*)/);
  if (!match) return {};
  const [, x, y, blur, , color] = match;
  // spread (match[4]) is consumed but discarded — RN doesn't support it
  const blurRadius = parseInt(blur, 10);
  return {
    shadowColor: color.trim(),
    shadowOffset: { width: parseInt(x, 10), height: parseInt(y, 10) },
    shadowOpacity: 1,
    shadowRadius: blurRadius,
    elevation: Math.ceil(blurRadius / 2),
  };
}

/** Parse CSS transform string → RN transform array */
function parseTransformString(transform: string): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];
  const regex = /(\w+)\(([^)]+)\)/g;
  let m;
  while ((m = regex.exec(transform)) !== null) {
    const [, fn, val] = m;
    // Strip px from transform values (e.g., translateX(10px) → translateX: 10)
    const strippedVal = stripUnit(val.trim());
    if (fn === 'rotate' || fn === 'rotateX' || fn === 'rotateY' || fn === 'rotateZ' || fn === 'skewX' || fn === 'skewY') {
      result.push({ [fn]: val.trim() });
    } else {
      const numVal = typeof strippedVal === 'number' ? strippedVal : parseFloat(val);
      result.push({ [fn]: isNaN(numVal) ? val.trim() : numVal });
    }
  }
  return result;
}

/** Convert CSS angle to expo-linear-gradient start/end coordinates (I4) */
function angleToCoordinates(angle: number): { start: { x: number; y: number }; end: { x: number; y: number } } {
  // CSS gradient angles: 0deg = bottom-to-top, 90deg = left-to-right
  // Convert to radians, then to start/end points in [0,1] space
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = Math.round((Math.cos(rad) + 1) / 2 * 100) / 100;
  const y = Math.round((Math.sin(rad) + 1) / 2 * 100) / 100;
  return {
    start: { x: 1 - x, y: 1 - y },
    end: { x, y },
  };
}

/** CSS keyword directions → angles */
const DIRECTION_TO_ANGLE: Record<string, number> = {
  'to top': 0,
  'to right': 90,
  'to bottom': 180,
  'to left': 270,
  'to top right': 45,
  'to top left': 315,
  'to bottom right': 135,
  'to bottom left': 225,
};

/** Parse linear-gradient CSS → colors array + start/end (C1: handle rgba, C2: keyword dirs, I4: compute coords) */
function parseLinearGradient(value: string): { colors: string[]; start: { x: number; y: number }; end: { x: number; y: number } } | null {
  // C1: Use balanced parentheses matching instead of [^)]+ to handle rgba()/hsla()
  const gradientStart = value.indexOf('linear-gradient(');
  if (gradientStart === -1) return null;

  // Find the matching closing paren, respecting nested parens (rgba, hsla, etc.)
  const contentStart = gradientStart + 'linear-gradient('.length;
  let depth = 1;
  let i = contentStart;
  while (i < value.length && depth > 0) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') depth--;
    i++;
  }
  if (depth !== 0) return null;

  const content = value.substring(contentStart, i - 1);

  // Split on commas that are NOT inside parentheses
  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;
  for (const char of content) {
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (char === ',' && parenDepth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());

  if (parts.length < 2) return null;

  // C2: Check first part for angle or direction keyword
  let angle = 180; // default: top-to-bottom
  let colorStartIndex = 0;
  const firstPart = parts[0];

  // Check keyword directions (to right, to bottom left, etc.)
  if (firstPart.startsWith('to ')) {
    const dirAngle = DIRECTION_TO_ANGLE[firstPart];
    if (dirAngle !== undefined) {
      angle = dirAngle;
      colorStartIndex = 1;
    }
  } else {
    // Check numeric angle: supports negative, decimal, deg/turn/grad/rad
    const angleMatch = firstPart.match(/^(-?\d+(?:\.\d+)?)(deg|turn|grad|rad)$/);
    if (angleMatch) {
      const [, num, unit] = angleMatch;
      const val = parseFloat(num);
      switch (unit) {
        case 'deg': angle = val; break;
        case 'turn': angle = val * 360; break;
        case 'grad': angle = val * 0.9; break;
        case 'rad': angle = val * (180 / Math.PI); break;
      }
      colorStartIndex = 1;
    }
  }

  // Extract colors (strip any percentage stop positions for now)
  const colors = parts.slice(colorStartIndex).map(p => p.replace(/\s+\d+(?:\.\d+)?%$/, '').trim());

  if (colors.length === 0) return null;

  // I4: compute start/end from angle
  const { start, end } = angleToCoordinates(angle);

  return { colors, start, end };
}

/** Convert percentage string to numeric value based on screen dimension */
function percentToNumeric(value: string, dimension: 'width' | 'height'): number {
  const pct = parseFloat(value) / 100;
  const screen = Dimensions.get('window');
  return Math.round(pct * screen[dimension]);
}

/** Percentage props that need width-based calculation */
const WIDTH_PERCENT_PROPS = new Set([
  'paddingHorizontal', 'paddingLeft', 'paddingRight',
  'marginHorizontal', 'marginLeft', 'marginRight',
]);

/** Percentage props that need height-based calculation */
const HEIGHT_PERCENT_PROPS = new Set([
  'paddingVertical', 'paddingTop', 'paddingBottom',
  'marginVertical', 'marginTop', 'marginBottom',
]);

/** S3: display values to translate */
const VALID_RN_DISPLAY = new Set(['flex', 'none']);

export function cssToNative(style: Record<string, unknown> | undefined | null): CssToNativeResult {
  if (!style || typeof style !== 'object') return { style: {} };

  // I1: Check cache with generation tracking for dimension-dependent values
  const cached = cacheWithGeneration.get(style);
  if (cached) {
    // If the cached result has no percentages, it's always valid
    // If it has percentages, only valid if dimensions haven't changed
    if (!cached.hasPercentages || cached.generation === dimensionGeneration) {
      return cached.result;
    }
  }

  const result: Record<string, unknown> = {};
  let needsGradient = false;
  let gradientConfig: CssToNativeResult['gradientConfig'] | undefined;
  let hasPercentages = false;

  for (const [key, rawValue] of Object.entries(style)) {
    // Skip ignored web-only properties
    if (IGNORED_PROPS.has(key)) continue;

    // S2: Property renaming (textDecoration → textDecorationLine, etc.)
    const effectiveKey = PROPERTY_RENAMES[key] ?? key;

    // boxShadow → RN shadow props
    if (effectiveKey === 'boxShadow' && typeof rawValue === 'string') {
      Object.assign(result, parseBoxShadow(rawValue));
      continue;
    }

    // I5: background with plain color → backgroundColor; with gradient → flag wrapper
    if ((effectiveKey === 'background' || effectiveKey === 'backgroundImage') && typeof rawValue === 'string') {
      if (rawValue.includes('linear-gradient')) {
        const parsed = parseLinearGradient(rawValue);
        if (parsed) {
          needsGradient = true;
          gradientConfig = parsed;
        }
      } else {
        // Plain color value — translate to backgroundColor
        result.backgroundColor = rawValue;
      }
      continue;
    }

    // position: fixed → absolute
    if (effectiveKey === 'position' && rawValue === 'fixed') {
      result.position = 'absolute';
      continue;
    }

    // S3: display block/inline → flex (RN only supports flex/none)
    if (effectiveKey === 'display' && typeof rawValue === 'string' && !VALID_RN_DISPLAY.has(rawValue)) {
      result.display = 'flex';
      continue;
    }

    // transform string → array
    if (effectiveKey === 'transform' && typeof rawValue === 'string') {
      result.transform = parseTransformString(rawValue);
      continue;
    }

    // Percentage in padding/margin → numeric via Dimensions
    if (typeof rawValue === 'string' && rawValue.endsWith('%')) {
      if (WIDTH_PERCENT_PROPS.has(effectiveKey) || effectiveKey === 'padding' || effectiveKey === 'margin') {
        result[effectiveKey] = percentToNumeric(rawValue, 'width');
        hasPercentages = true;
        continue;
      }
      if (HEIGHT_PERCENT_PROPS.has(effectiveKey)) {
        result[effectiveKey] = percentToNumeric(rawValue, 'height');
        hasPercentages = true;
        continue;
      }
      // width/height with % pass through — RN supports these
    }

    // Strip px/em/rem/vh/vw units
    const stripped = stripUnit(rawValue);
    result[effectiveKey] = stripped;
  }

  // I2: Only include needsGradient/gradientConfig when actually needed
  const output: CssToNativeResult = { style: result };
  if (needsGradient) {
    output.needsGradient = true;
    output.gradientConfig = gradientConfig;
  }

  // I1: Store with generation for dimension-aware invalidation
  cacheWithGeneration.set(style, { result: output, generation: dimensionGeneration, hasPercentages });
  return output;
}
