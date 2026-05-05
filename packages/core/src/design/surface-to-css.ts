import type { StructuredSurfaceStyles, StructuredSurfaceStyleProps, ShadowDef, BorderDef, BorderStyle, ElevationStyle } from './identity/index.js';
import { depthScale, hexToRgba } from './identity/index.js';

/** Platform-neutral CSS style properties. Avoids importing React types in core. */
export interface CSSStyleProps {
  backgroundColor?: string;
  color?: string;
  border?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  boxShadow?: string;
  backdropFilter?: string;
  WebkitBackdropFilter?: string;
  [key: string]: string | number | undefined;
}

export interface CSSSurfaceStyles {
  card: CSSStyleProps;
  input: CSSStyleProps;
  inputFocus: CSSStyleProps;
  buttonPrimary: CSSStyleProps;
  buttonSecondary: CSSStyleProps;
  modal: CSSStyleProps;
}

function borderToCSS(b: BorderDef): string {
  return `${b.width}px ${b.style} ${b.color}`;
}

function shadowToCSS(s: ShadowDef, depth: number, angle: number): string {
  const isFocusRing = s.magnitude === 0 && s.spread !== undefined;
  const scale = isFocusRing ? 1 : depthScale(depth);
  const rad = (angle * Math.PI) / 180;

  const offsetX = isFocusRing ? 0 : Math.round(s.magnitude * scale * Math.sin(rad));
  const offsetY = isFocusRing ? 0 : Math.round(s.magnitude * scale * Math.cos(rad));
  const blur = isFocusRing ? 0 : Math.round(s.blur * scale);
  const opacity = isFocusRing ? s.opacity : Math.min(+(s.opacity * scale).toFixed(2), 1);

  const { r, g, b } = s.color;
  const spreadStr = s.spread !== undefined ? ` ${s.spread}px` : '';
  const insetStr = s.inset ? 'inset ' : '';
  return `${insetStr}${offsetX}px ${offsetY}px ${blur}px${spreadStr} rgba(${r},${g},${b},${opacity})`;
}

function propsToCSS(props: StructuredSurfaceStyleProps, depth: number, angle: number): CSSStyleProps {
  const css: CSSStyleProps = {};

  if (props.backgroundColor) {
    css.backgroundColor = props.backgroundOpacity !== undefined
      ? hexToRgba(props.backgroundColor, props.backgroundOpacity)
      : props.backgroundColor;
  }

  if (props.color) css.color = props.color;

  // Explicit 'none' resets browser defaults (e.g. input default border)
  css.border = props.border ? borderToCSS(props.border) : 'none';
  if (props.borderTop) css.borderTop = borderToCSS(props.borderTop);
  if (props.borderRight) css.borderRight = borderToCSS(props.borderRight);
  if (props.borderBottom) css.borderBottom = borderToCSS(props.borderBottom);
  if (props.borderLeft) css.borderLeft = borderToCSS(props.borderLeft);

  if (props.shadows.length > 0) {
    css.boxShadow = props.shadows.map(s => shadowToCSS(s, depth, angle)).join(', ');
  } else {
    css.boxShadow = 'none';
  }

  if (props.blur) {
    css.backdropFilter = `blur(${props.blur.radius}px)`;
    (css as Record<string, unknown>).WebkitBackdropFilter = `blur(${props.blur.radius}px)`;
  }

  return css;
}

export function surfaceToCSS(styles: StructuredSurfaceStyles, depth: number, shadowAngle: number): CSSSurfaceStyles {
  return {
    card: propsToCSS(styles.card, depth, shadowAngle),
    input: propsToCSS(styles.input, depth, shadowAngle),
    inputFocus: propsToCSS(styles.inputFocus, depth, shadowAngle),
    buttonPrimary: propsToCSS(styles.buttonPrimary, depth, shadowAngle),
    buttonSecondary: propsToCSS(styles.buttonSecondary, depth, shadowAngle),
    modal: propsToCSS(styles.modal, depth, shadowAngle),
  };
}

// --- Border & Elevation Identity Override ---

export interface BorderElevationConfig {
  borderWidth: number;
  borderStyle: BorderStyle;
  borderColor: string;
  elevationStyle: ElevationStyle;
  elevationColor: string;
  depth: number;
  shadowAngle: number;
  /** Which slot groups to override */
  slots: { cardModal: boolean; inputButtons: boolean };
}

function elevationToCSS(style: ElevationStyle, depth: number, angle: number, color: string): string {
  if (style === 'none' || depth === 0) return 'none';
  const scale = depthScale(depth);
  const rad = (angle * Math.PI) / 180;
  const mag = 4;
  const offX = Math.round(mag * scale * Math.sin(rad));
  const offY = Math.round(mag * scale * Math.cos(rad));

  switch (style) {
    case 'solid':
      return `${offX}px ${offY}px 0px 0px ${color}`;
    case 'color': {
      const hex = color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const blur = Math.round(16 * scale);
      const opacity = Math.min(+(0.3 * scale).toFixed(2), 1);
      return `0px ${offY}px ${blur}px rgba(${r},${g},${b},${opacity})`;
    }
    case 'diffuse':
    default: {
      const blur = Math.round(12 * scale);
      const opacity = Math.min(+(0.15 * scale).toFixed(2), 1);
      return `0px ${offY}px ${blur}px rgba(0,0,0,${opacity})`;
    }
  }
}

// --- Gradient Identity Override ---

export type GradientCardsMode = 'vibrant' | 'soft' | 'muted';

export interface GradientCardsConfig {
  primaryColor: string;
  surfaceColor: string;
  /** Mode controls intensity of the primary tint. `true` defaults to 'muted'. */
  mode?: GradientCardsMode;
}

/**
 * Diagonal primary→surface gradient on the card surface. Mode picks intensity:
 *  - 'soft':    8% alpha primary, fades to surface at 70%   — subtle kiss
 *  - 'muted':  20% alpha primary, fades to surface at 60%   — balanced default
 *  - 'vibrant': 33% alpha primary, fades to surface at 50%  — dramatic editorial
 *
 * Stays at the surface CSS layer (same level as applyBorderElevationCSS) so
 * primitives consume `surface.card` uniformly without per-component branching.
 */
export function applyGradientCardsCSS(
  surface: CSSSurfaceStyles,
  config: GradientCardsConfig,
): CSSSurfaceStyles {
  const { primaryColor, surfaceColor, mode = 'muted' } = config;
  const stops: Record<GradientCardsMode, { alpha: string; end: number }> = {
    soft:    { alpha: '14', end: 70 },
    muted:   { alpha: '33', end: 60 },
    vibrant: { alpha: '55', end: 50 },
  };
  const { alpha, end } = stops[mode];
  const gradient = `linear-gradient(135deg, ${primaryColor}${alpha} 0%, transparent ${end}%)`;
  // Use `backgroundImage` (longhand) so it composes with `backgroundColor`
  // from the surface treatment without React inline-style shorthand/longhand
  // conflicts. The image overlays the solid color underneath.
  const cardWithGradient: CSSStyleProps = { ...surface.card, backgroundImage: gradient };
  return { ...surface, card: cardWithGradient };
}

export function applyBorderElevationCSS(
  surface: CSSSurfaceStyles,
  config: BorderElevationConfig,
): CSSSurfaceStyles {
  const { borderWidth, borderStyle, borderColor, elevationStyle, elevationColor, depth, shadowAngle, slots } = config;

  const border = (borderWidth === 0 || borderStyle === 'none')
    ? 'none'
    : `${borderWidth}px ${borderStyle} ${borderColor}`;

  const boxShadow = elevationToCSS(elevationStyle, depth, shadowAngle, elevationColor);

  const result = { ...surface };
  if (slots.cardModal) {
    result.card = { ...surface.card, border, boxShadow };
    result.modal = { ...surface.modal, border, boxShadow };
  }
  if (slots.inputButtons) {
    result.input = { ...surface.input, border, boxShadow };
    result.buttonPrimary = { ...surface.buttonPrimary, border, boxShadow };
    result.buttonSecondary = { ...surface.buttonSecondary, border, boxShadow };
    // inputFocus is NOT overridden — focus ring must always work for accessibility
  }
  return result;
}
