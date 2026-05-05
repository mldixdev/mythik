import type { CSSProperties } from 'react';

interface PieChartSegment {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data?: PieChartSegment[];
  size?: number;
  donut?: boolean;
  style?: CSSProperties;
}

const DEFAULT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function PieChart({ data = [], size = 200, donut = false, style }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const r = size / 2;
  const cx = r;
  const cy = r;
  const outerR = r - 2;
  const innerR = donut ? outerR * 0.6 : 0;

  let cumulativeAngle = -Math.PI / 2;

  const segments = data.map((seg, i) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;

    let d: string;
    if (donut) {
      const ix1 = cx + innerR * Math.cos(startAngle);
      const iy1 = cy + innerR * Math.sin(startAngle);
      const ix2 = cx + innerR * Math.cos(endAngle);
      const iy2 = cy + innerR * Math.sin(endAngle);
      d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
    } else {
      d = `M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    }

    return (
      <path key={i} d={d} fill={seg.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}>
        <title>{`${seg.label}: ${seg.value}`}</title>
      </path>
    );
  });

  return (
    <div role="img" aria-label="Pie chart" style={{ width: size, height: size, ...style }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: '100%' }}>
        {segments}
      </svg>
    </div>
  );
}
