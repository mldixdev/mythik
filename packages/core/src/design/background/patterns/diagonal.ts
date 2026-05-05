export type DiagonalPatternConfig = {
  spacing: number;
  thickness?: number;
  color?: string;
  angle?: number;
};

export function diagonalPatternSVG(config: DiagonalPatternConfig): string {
  const { spacing, thickness = 1, color = 'currentColor', angle = 45 } = config;
  return `<pattern id="diagonal-${spacing}-${thickness}-${angle}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">` +
    `<line x1="0" y1="0" x2="0" y2="${spacing}" stroke="${color}" stroke-width="${thickness}"/>` +
    `</pattern>`;
}
