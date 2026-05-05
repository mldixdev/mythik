// Forge Identity System — Elevation
import type { ElevationStyle } from './types.js';

/** Depth scale: 0→0.3x, 0.5→1.0x, 1.0→2.0x (piecewise linear) */
export function depthScale(depth: number): number {
  return depth <= 0.5
    ? 0.3 + (depth / 0.5) * 0.7
    : 1.0 + ((depth - 0.5) / 0.5) * 1.0;
}

export function resolveElevationStyle(
  style: ElevationStyle,
  depth: number,
  config: { offset: number; color: string },
): string {
  if (style === 'none' || depth === 0) return 'none';
  const intensity = depth;
  const off = Math.round(config.offset * intensity);

  switch (style) {
    case 'diffuse': {
      const blur = Math.round(12 * intensity);
      const opacity = (0.15 * intensity).toFixed(2);
      return `0px ${off}px ${blur}px rgba(0,0,0,${opacity})`;
    }
    case 'solid':
      return `${off}px ${off}px 0px 0px ${config.color}`;
    case 'color': {
      const blur = Math.round(16 * intensity);
      const hex = config.color.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const opacity = (0.3 * intensity).toFixed(2);
      return `0px ${off}px ${blur}px rgba(${r},${g},${b},${opacity})`;
    }
  }
}
