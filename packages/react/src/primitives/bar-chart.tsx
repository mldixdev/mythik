import type { CSSProperties } from 'react';

interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data?: BarChartDataPoint[];
  height?: number;
  style?: CSSProperties;
}

export function BarChart({ data = [], height = 200, style }: BarChartProps) {
  if (data.length === 0) return <div style={{ height, ...style }} />;

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  // Use relative scaling: shortest bar = 20%, tallest = 100%
  const range = maxValue - minValue || 1;

  return (
    <div role="img" aria-label="Bar chart" style={{ height, display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 8 }}>
        {data.map((point, i) => {
          const normalizedHeight = 20 + ((point.value - minValue) / range) * 80;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{point.value}</span>
              <div
                style={{
                  width: '70%',
                  height: `${normalizedHeight}%`,
                  backgroundColor: point.color ?? '#6366f1',
                  borderRadius: '6px 6px 0 0',
                  minHeight: 8,
                  transition: 'height 300ms',
                }}
                title={`${point.label}: ${point.value}`}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
        {data.map((point, i) => (
          <span key={i} style={{ flex: 1, fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
