// Forge Identity System — Shape
import type { RadiusPattern, BorderStyle } from './types.js';

export function resolveRadiusPattern(pattern: RadiusPattern, radius: number): string {
  const r = `${radius}px`;
  const z = '0px';
  switch (pattern) {
    case 'all': return r;
    case 'top': return `${r} ${r} ${z} ${z}`;
    case 'bottom': return `${z} ${z} ${r} ${r}`;
    case 'diagonal': return `${r} ${z} ${r} ${z}`;
    case 'inverse-diagonal': return `${z} ${r} ${z} ${r}`;
    case 'left': return `${r} ${z} ${z} ${r}`;
    case 'right': return `${z} ${r} ${r} ${z}`;
    case 'single': return `${r} ${z} ${z} ${z}`;
    case 'single-tr': return `${z} ${r} ${z} ${z}`;
    case 'single-bl': return `${z} ${z} ${z} ${r}`;
    case 'single-br': return `${z} ${z} ${r} ${z}`;
  }
}

export function resolveBorderStyle(width: number, style: BorderStyle, color: string): string | undefined {
  if (width === 0 || style === 'none') return undefined;
  return `${width}px ${style} ${color}`;
}
