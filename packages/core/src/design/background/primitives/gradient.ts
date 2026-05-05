import type { GradientLayerConfig, GradientStop, LayerSpec } from '../../identity/types.js';
import { resolveCommon } from './solid.js';

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return null;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function applyOpacity(color: string, opacity: number | undefined): string {
  if (opacity === undefined || opacity === 1) return color;
  if (color === 'transparent') return color;
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
}

function stopsToCSS(stops: GradientStop[]): string {
  return stops.map((s) => `${applyOpacity(s.color, s.opacity)} ${s.at}`).join(', ');
}

function stopsToSVG(stops: GradientStop[]): string {
  return stops.map((s) => {
    const pct = s.at.endsWith('%') ? s.at : `${s.at}%`;
    const opacity = s.opacity ?? (s.color === 'transparent' ? 0 : 1);
    const color = s.color === 'transparent' ? '#000000' : s.color;
    return `<stop offset="${pct}" stop-color="${color}" stop-opacity="${opacity}"/>`;
  }).join('');
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `svg-gradient-${idCounter}`;
}

export function resolveGradient(config: GradientLayerConfig, index: number): LayerSpec {
  const id = nextId();
  let css: string;
  let svgDef: string;

  if (config.kind === 'linear') {
    const angle = config.angle ?? 180;
    css = `linear-gradient(${angle}deg, ${stopsToCSS(config.stops)})`;
    svgDef = `<linearGradient id="${id}" gradientTransform="rotate(${angle - 90})">${stopsToSVG(config.stops)}</linearGradient>`;
  } else if (config.kind === 'radial') {
    const shape = config.shape ?? 'ellipse';
    const size = config.size ?? 'farthest-corner';
    const position = config.position ?? 'center';
    css = `radial-gradient(${shape} ${size} at ${position}, ${stopsToCSS(config.stops)})`;
    svgDef = `<radialGradient id="${id}">${stopsToSVG(config.stops)}</radialGradient>`;
  } else {
    // conic — CSS supported on web; SVG has no native conic (RN fallback in plan 3)
    const angle = config.angle ?? 0;
    const position = config.position ?? 'center';
    css = `conic-gradient(from ${angle}deg at ${position}, ${stopsToCSS(config.stops)})`;
    svgDef = `<!-- conic gradient fallback: ${id} -->`;
  }

  return {
    kind: 'gradient',
    css,
    svg: { def: svgDef, fill: `url(#${id})` },
    common: resolveCommon(config, index),
  };
}
