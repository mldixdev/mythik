import type { CSSProperties } from 'react';

interface AreaChartDataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data?: AreaChartDataPoint[];
  height?: number;
  color?: string;
  style?: CSSProperties;
}

export function AreaChart({ data = [], height = 200, color = '#3b82f6', style }: AreaChartProps) {
  if (data.length === 0) return <div style={{ height, ...style }} />;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;
  const width = 100;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const linePoints = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d.value - minValue) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;

  return (
    <div role="img" aria-label="Area chart" style={{ height, ...style }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <polygon points={areaPoints} fill={color} fillOpacity="0.2" />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
