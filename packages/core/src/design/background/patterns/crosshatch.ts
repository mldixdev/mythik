export type CrosshatchPatternConfig = {
  spacing: number;
  thickness?: number;
  color?: string;
  angle?: number;
};

export function crosshatchPatternSVG(config: CrosshatchPatternConfig): string {
  const { spacing, thickness = 1, color = 'currentColor', angle = 45 } = config;
  return `<pattern id="crosshatch-${spacing}-${thickness}-${angle}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">` +
    `<g transform="rotate(${angle} ${spacing / 2} ${spacing / 2})">` +
    `<line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${color}" stroke-width="${thickness}"/>` +
    `</g>` +
    `<g transform="rotate(${-angle} ${spacing / 2} ${spacing / 2})">` +
    `<line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${color}" stroke-width="${thickness}"/>` +
    `</g>` +
    `</pattern>`;
}
