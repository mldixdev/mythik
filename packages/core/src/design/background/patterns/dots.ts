export type DotsPatternConfig = {
  spacing: number;
  dotRadius?: number;
  color?: string;
};

export function dotsPatternSVG(config: DotsPatternConfig): string {
  const { spacing, dotRadius = 2, color = 'currentColor' } = config;
  const cx = spacing / 2;
  const cy = spacing / 2;
  return `<pattern id="dots-${spacing}-${dotRadius}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">` +
    `<circle cx="${cx}" cy="${cy}" r="${dotRadius}" fill="${color}"/>` +
    `</pattern>`;
}
