// Forge Identity System — Surface Treatment
import type { SurfaceType, StructuredSurfaceStyles, StructuredSurfaceStyleProps, ShadowDef, BorderDef } from './types.js';
import { hexToRgba } from './color.js';

interface SurfaceColors {
  surface: string;
  background: string;
  border: string;
  primary: string;
  text: string;
  inputSurface?: string;  // distinct input bg for colored-surface layers
}

interface SurfaceOptions {
  accent?: string;
  cardLine?: ('top' | 'left' | 'bottom' | 'right')[];
  accentButtons?: boolean;
  focusColor?: string;
}

const BLACK: ShadowDef['color'] = { r: 0, g: 0, b: 0 };
const WHITE: ShadowDef['color'] = { r: 255, g: 255, b: 255 };

function sh(magnitude: number, blur: number, opacity: number, inset = false, spread?: number, color: ShadowDef['color'] = BLACK): ShadowDef {
  return { magnitude, blur, opacity, color, inset, ...(spread !== undefined ? { spread } : {}) };
}

function neoShadows(mag: number, blur: number, darkOpacity: number): ShadowDef[] {
  return [
    sh(mag, blur, darkOpacity, false, undefined, BLACK),
    sh(mag, blur, 0.7, false, undefined, WHITE),
  ];
}

function neoInsetShadows(mag: number, blur: number, darkOpacity: number): ShadowDef[] {
  return [
    sh(mag, blur, darkOpacity, true, undefined, BLACK),
    sh(mag, blur, 0.6, true, undefined, WHITE),
  ];
}

/** Parse hex color to {r,g,b}. Handles 6 or 8 char hex. */
function hexToRgb(hex: string): ShadowDef['color'] {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

/** Parse hex + 2-digit alpha suffix into color and opacity. */
function parseHexAlpha(hex: string): { color: ShadowDef['color']; opacity: number } {
  const h = hex.replace('#', '');
  const color = hexToRgb(hex);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { color, opacity: +a.toFixed(3) };
}

function focusRing(primaryHex: string): ShadowDef {
  const { color, opacity } = parseHexAlpha(primaryHex + '25');
  return sh(0, 0, opacity, false, 3, color);
}

export function resolveSurfaceStyles(surface: SurfaceType, colors: SurfaceColors, options?: SurfaceOptions): StructuredSurfaceStyles {
  const c = colors;
  const iSurface = c.inputSurface ?? c.surface;
  const accent = options?.accent;
  const cardLine = options?.cardLine ?? [];
  const accentButtons = options?.accentButtons ?? false;
  const btnColor = accentButtons && accent ? accent : c.primary;

  const ring = focusRing(options?.focusColor ?? c.primary);
  const brd = (w: number, color: string, style: BorderDef['style'] = 'solid'): BorderDef => ({ width: w, style, color });

  let result: StructuredSurfaceStyles;

  switch (surface) {
    case 'elevated':
      result = {
        card: { backgroundColor: c.surface, color: c.text, shadows: [sh(1, 3, 0.08), sh(4, 12, 0.06)], border: brd(1, c.border) },
        input: { backgroundColor: iSurface, color: c.text, border: brd(1, c.border), shadows: [sh(1, 2, 0.04, true)] },
        inputFocus: { border: brd(1, c.primary), shadows: [ring] },
        buttonPrimary: { backgroundColor: btnColor, color: '#fff', shadows: [sh(1, 3, 0.12)] },
        buttonSecondary: { backgroundColor: c.surface, color: c.text, border: brd(1, c.border), shadows: [] },
        modal: { backgroundColor: c.surface, color: c.text, shadows: [sh(8, 32, 0.12), sh(2, 8, 0.08)] },
      };
      break;
    case 'flat':
      result = {
        card: { backgroundColor: c.surface, color: c.text, shadows: [] },
        input: { backgroundColor: c.inputSurface ?? c.background, color: c.text, shadows: [] },
        inputFocus: { shadows: [ring] },
        buttonPrimary: { backgroundColor: btnColor, color: '#fff', shadows: [] },
        buttonSecondary: { backgroundColor: c.background, color: c.text, shadows: [] },
        modal: { backgroundColor: c.surface, color: c.text, shadows: [] },
      };
      break;
    case 'outlined':
      result = {
        card: { backgroundColor: 'transparent', color: c.text, border: brd(1, c.border), shadows: [] },
        input: { backgroundColor: 'transparent', color: c.text, border: brd(1, c.border), shadows: [] },
        inputFocus: { border: brd(1, c.primary), shadows: [ring] },
        buttonPrimary: { backgroundColor: 'transparent', color: btnColor, border: brd(1, btnColor), shadows: [] },
        buttonSecondary: { backgroundColor: 'transparent', color: c.text, border: brd(1, c.border), shadows: [] },
        modal: { backgroundColor: c.surface, color: c.text, border: brd(1, c.border), shadows: [] },
      };
      break;
    case 'glass':
      result = {
        card: { backgroundColor: c.surface, color: c.text, backgroundOpacity: 0.6, blur: { radius: 16 }, border: brd(1, hexToRgba(c.surface, 0.2)), shadows: [] },
        input: { backgroundColor: iSurface, color: c.text, backgroundOpacity: 0.4, blur: { radius: 8 }, border: brd(1, hexToRgba(iSurface, 0.15)), shadows: [] },
        inputFocus: { border: brd(1, c.primary + '80'), shadows: [ring] },
        buttonPrimary: { backgroundColor: btnColor, color: '#fff', backgroundOpacity: 0.8, blur: { radius: 8 }, shadows: [] },
        buttonSecondary: { backgroundColor: c.surface, color: c.text, backgroundOpacity: 0.3, blur: { radius: 8 }, border: brd(1, hexToRgba(c.surface, 0.2)), shadows: [] },
        modal: { backgroundColor: c.surface, color: c.text, backgroundOpacity: 0.85, blur: { radius: 24 }, border: brd(1, hexToRgba(c.surface, 0.2)), shadows: [] },
      };
      break;
    case 'bold':
      result = {
        card: { backgroundColor: c.surface, color: c.text, border: brd(3, c.text), shadows: [] },
        input: { backgroundColor: iSurface, color: c.text, border: brd(2, c.text), shadows: [] },
        inputFocus: { border: brd(2, c.primary), shadows: [ring] },
        buttonPrimary: { backgroundColor: btnColor, color: '#fff', border: brd(2, c.text), shadows: [] },
        buttonSecondary: { backgroundColor: 'transparent', color: c.text, border: brd(2, c.text), shadows: [] },
        modal: { backgroundColor: c.surface, color: c.text, border: brd(3, c.text), shadows: [] },
      };
      break;
    case 'neo': {
      const neoOut = neoShadows(4, 8, 0.1);
      const neoIn = neoInsetShadows(2, 4, 0.08);
      const { color: focusColor, opacity: focusOpacity } = parseHexAlpha(c.primary + '20');
      const neoFocusIn: ShadowDef[] = [
        { ...neoIn[0], color: focusColor, opacity: focusOpacity },
        neoIn[1],
      ];
      result = {
        card: { backgroundColor: c.surface, color: c.text, shadows: neoOut },
        input: { backgroundColor: iSurface, color: c.text, shadows: neoIn },
        inputFocus: { shadows: [...neoFocusIn, ring] },
        buttonPrimary: { backgroundColor: btnColor, color: '#fff', shadows: neoOut },
        buttonSecondary: { backgroundColor: c.surface, color: c.text, shadows: neoOut },
        modal: { backgroundColor: c.surface, color: c.text, shadows: neoShadows(8, 16, 0.12) },
      };
      break;
    }
  }

  // Apply cardLine accent borders to card
  if (cardLine.length > 0 && accent) {
    const line = brd(3, accent);
    for (const pos of cardLine) {
      const prop = `border${pos.charAt(0).toUpperCase() + pos.slice(1)}` as keyof StructuredSurfaceStyleProps;
      (result.card as unknown as Record<string, unknown>)[prop] = line;
    }
  }

  return result;
}
