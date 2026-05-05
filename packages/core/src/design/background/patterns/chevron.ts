export type ChevronPatternConfig = {
  spacing: number;
  thickness?: number;
  color?: string;
  angle?: number;
};

export function chevronPatternSVG(config: ChevronPatternConfig): string {
  const { spacing, thickness = 1, color = 'currentColor', angle = 0 } = config;
  const half = spacing / 2;
  const points = `0,${spacing} ${half},0 ${spacing},${spacing}`;
  const transform = angle !== 0 ? ` patternTransform="rotate(${angle})"` : '';
  return `<pattern id="chevron-${spacing}-${thickness}-${angle}" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse"${transform}>` +
    `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${thickness}"/>` +
    `</pattern>`;
}
