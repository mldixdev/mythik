import type { CSSProperties } from 'react';

interface LineChartDataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data?: LineChartDataPoint[];
  height?: number;
  color?: string;
  style?: CSSProperties;
}

export function LineChart({ data = [], height = 200, color = '#3b82f6', style }: LineChartProps) {
  if (data.length === 0) return <div style={{ height, ...style }} />;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;
  const width = 100;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d.value - minValue) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div role="img" aria-label="Line chart" style={{ height, position: 'relative', ...style }}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280', marginTop: 4 }}>
        {data.map((d, i) => <span key={i}>{d.label}</span>)}
      </div>
    </div>
  );
}
