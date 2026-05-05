import type { StructuredSurfaceStyles, StructuredSurfaceStyleProps, BorderDef, BlurDef, BorderStyle, ElevationStyle } from './identity/index.js';
import { depthScale, hexToRgba } from './identity/index.js';

export interface RNSurfaceStyleProps {
  backgroundColor?: string;
  color?: string;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  borderTopWidth?: number;
  borderTopColor?: string;
  borderTopStyle?: 'solid' | 'dashed' | 'dotted';
  borderRightWidth?: number;
  borderRightColor?: string;
  borderRightStyle?: 'solid' | 'dashed' | 'dotted';
  borderBottomWidth?: number;
  borderBottomColor?: string;
  borderBottomStyle?: 'solid' | 'dashed' | 'dotted';
  borderLeftWidth?: number;
  borderLeftColor?: string;
  borderLeftStyle?: 'solid' | 'dashed' | 'dotted';
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowRadius?: number;
  shadowOpacity?: number;
  elevation?: number;
  blur?: BlurDef;
  focusRing?: { width: number; color: string };
}

export interface RNSurfaceStyles {
  card: RNSurfaceStyleProps;
  input: RNSurfaceStyleProps;
  inputFocus: RNSurfaceStyleProps;
  buttonPrimary: RNSurfaceStyleProps;
  buttonSecondary: RNSurfaceStyleProps;
  modal: RNSurfaceStyleProps;
}

function borderToRN(b: BorderDef, prefix: '' | 'Top' | 'Right' | 'Bottom' | 'Left'): Record<string, unknown> {
  const style = b.style === 'double' ? 'solid' : b.style;
  return {
    [`border${prefix}Width`]: b.width,
    [`border${prefix}Color`]: b.color,
    [`border${prefix}Style`]: style,
  };
}

function propsToRN(props: StructuredSurfaceStyleProps, depth: number, angle: number): RNSurfaceStyleProps {
  const out: RNSurfaceStyleProps = {};

  if (props.backgroundColor) {
    out.backgroundColor = props.backgroundOpacity !== undefined
      ? hexToRgba(props.backgroundColor, props.backgroundOpacity)
      : props.backgroundColor;
  }

  if (props.color) out.color = props.color;

  if (props.border) Object.assign(out, borderToRN(props.border, ''));
  if (props.borderTop) Object.assign(out, borderToRN(props.borderTop, 'Top'));
  if (props.borderRight) Object.assign(out, borderToRN(props.borderRight, 'Right'));
  if (props.borderBottom) Object.assign(out, borderToRN(props.borderBottom, 'Bottom'));
  if (props.borderLeft) Object.assign(out, borderToRN(props.borderLeft, 'Left'));

  // Shadows: pick largest non-inset, non-focus-ring shadow
  const nonInset = props.shadows.filter(s => !s.inset && s.spread === undefined);
  const focusRings = props.shadows.filter(s => s.spread !== undefined);

  if (nonInset.length > 0) {
    const principal = nonInset.reduce((a, b) => b.magnitude > a.magnitude ? b : a, nonInset[0]);
    const scale = depthScale(depth);
    const rad = (angle * Math.PI) / 180;
    const offsetX = Math.round(principal.magnitude * scale * Math.sin(rad));
    const offsetY = Math.round(principal.magnitude * scale * Math.cos(rad));
    const scaledRadius = Math.round(principal.blur * scale);
    const scaledOpacity = Math.min(+(principal.opacity * scale).toFixed(2), 1);
    const { r, g, b } = principal.color;

    out.shadowOffset = { width: offsetX, height: offsetY };
    out.shadowRadius = scaledRadius;
    out.shadowOpacity = scaledOpacity;
    out.shadowColor = `rgb(${r},${g},${b})`;
    out.elevation = Math.max(1, Math.round(scaledRadius / 3));
  }

  if (focusRings.length > 0) {
    const ring = focusRings[0];
    const { r, g, b } = ring.color;
    out.focusRing = { width: ring.spread!, color: `rgba(${r},${g},${b},${ring.opacity})` };
  }

  if (props.blur) out.blur = props.blur;

  return out;
}

export function surfaceToRN(styles: StructuredSurfaceStyles, depth: number, shadowAngle: number): RNSurfaceStyles {
  return {
    card: propsToRN(styles.card, depth, shadowAngle),
    input: propsToRN(styles.input, depth, shadowAngle),
    inputFocus: propsToRN(styles.inputFocus, depth, shadowAngle),
    buttonPrimary: propsToRN(styles.buttonPrimary, depth, shadowAngle),
    buttonSecondary: propsToRN(styles.buttonSecondary, depth, shadowAngle),
    modal: propsToRN(styles.modal, depth, shadowAngle),
  };
}

// --- Border & Elevation Identity Override (RN) ---

export interface BorderElevationConfigRN {
  borderWidth: number;
  borderStyle: BorderStyle;
  borderColor: string;
  elevationStyle: ElevationStyle;
  elevationColor: string;
  depth: number;
  shadowAngle: number;
  slots: { cardModal: boolean; inputButtons: boolean };
}

function resolveElevationRN(
  style: ElevationStyle,
  depth: number,
  angle: number,
  color: string,
): Pick<RNSurfaceStyleProps, 'shadowOffset' | 'shadowRadius' | 'shadowOpacity' | 'shadowColor' | 'elevation'> {
  if (style === 'none' || depth === 0) {
    return { shadowOffset: { width: 0, height: 0 }, shadowRadius: 0, shadowOpacity: 0, shadowColor: '#000000', elevation: 0 };
  }

  const scale = depthScale(depth);
  const rad = (angle * Math.PI) / 180;
  const mag = 4;
  const offX = Math.round(mag * scale * Math.sin(rad));
  const offY = Math.round(mag * scale * Math.cos(rad));

  switch (style) {
    case 'solid':
      return {
        shadowOffset: { width: offX, height: offY },
        shadowRadius: 0,
        shadowOpacity: 1,
        shadowColor: color,
        elevation: Math.max(1, Math.round(scale * 2)),
      };
    case 'color': {
      const hex = color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const blur = Math.round(16 * scale);
      const opacity = Math.min(+(0.3 * scale).toFixed(2), 1);
      return {
        shadowOffset: { width: offX, height: offY },
        shadowRadius: blur,
        shadowOpacity: opacity,
        shadowColor: `rgb(${r},${g},${b})`,
        elevation: Math.max(1, Math.round(blur / 3)),
      };
    }
    case 'diffuse':
    default: {
      const blur = Math.round(12 * scale);
      const opacity = Math.min(+(0.15 * scale).toFixed(2), 1);
      return {
        shadowOffset: { width: offX, height: offY },
        shadowRadius: blur,
        shadowOpacity: opacity,
        shadowColor: color,
        elevation: Math.max(1, Math.round(blur / 3)),
      };
    }
  }
}

export function applyBorderElevationRN(
  surface: RNSurfaceStyles,
  config: BorderElevationConfigRN,
): RNSurfaceStyles {
  const { borderWidth, borderStyle, borderColor, elevationStyle, elevationColor, depth, shadowAngle, slots } = config;

  const rnBorderStyle = borderStyle === 'double' ? 'solid' : borderStyle;
  const borderProps = (borderWidth === 0 || borderStyle === 'none')
    ? { borderWidth: 0, borderColor: undefined as string | undefined, borderStyle: undefined as 'solid' | 'dashed' | 'dotted' | undefined }
    : { borderWidth, borderColor, borderStyle: rnBorderStyle as 'solid' | 'dashed' | 'dotted' };

  const shadowProps = resolveElevationRN(elevationStyle, depth, shadowAngle, elevationColor);
  const overrides = { ...borderProps, ...shadowProps };

  const result = { ...surface };
  if (slots.cardModal) {
    result.card = { ...surface.card, ...overrides };
    result.modal = { ...surface.modal, ...overrides };
  }
  if (slots.inputButtons) {
    result.input = { ...surface.input, ...overrides };
    result.buttonPrimary = { ...surface.buttonPrimary, ...overrides };
    result.buttonSecondary = { ...surface.buttonSecondary, ...overrides };
  }
  return result;
}
