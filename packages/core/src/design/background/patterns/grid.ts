export type GridPatternConfig = {
  spacing: number;
  thickness?: number;
  color?: string;
};

export function gridPatternSVG(config: GridPatternConfig): string {
  const { spacing, thickness = 1, color = 'currentColor' } = config;
  return `<pattern id="grid-${spacing}-${thickness}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">` +
    `<line x1="0" y1="0" x2="${spacing}" y2="0" stroke="${color}" stroke-width="${thickness}"/>` +
    `<line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${color}" stroke-width="${thickness}"/>` +
    `</pattern>`;
}
