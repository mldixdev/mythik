export type IsoPatternConfig = {
  spacing: number;
  thickness?: number;
  color?: string;
};

export function isoPatternSVG(config: IsoPatternConfig): string {
  const { spacing, thickness = 1, color = 'currentColor' } = config;
  const w = spacing;
  const h = spacing * Math.sqrt(3) / 2;
  return `<pattern id="iso-${spacing}-${thickness}" width="${w}" height="${h.toFixed(3)}" patternUnits="userSpaceOnUse">` +
    `<line x1="0" y1="0" x2="${w}" y2="${h.toFixed(3)}" stroke="${color}" stroke-width="${thickness}"/>` +
    `<line x1="${w}" y1="0" x2="0" y2="${h.toFixed(3)}" stroke="${color}" stroke-width="${thickness}"/>` +
    `<line x1="0" y1="${(h / 2).toFixed(3)}" x2="${w}" y2="${(h / 2).toFixed(3)}" stroke="${color}" stroke-width="${thickness}"/>` +
    `</pattern>`;
}
