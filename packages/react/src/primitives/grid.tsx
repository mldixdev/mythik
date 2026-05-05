import type { CSSProperties, ReactNode } from 'react';

interface GridProps {
  columns?: number | string;
  rows?: string;
  gap?: number | string;
  areas?: string;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

export function Grid({ columns = 1, rows, gap = 0, areas, style, className, children }: GridProps) {
  const gridTemplateColumns = typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns;

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns,
        ...(rows ? { gridTemplateRows: rows } : {}),
        ...(areas ? { gridTemplateAreas: areas } : {}),
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
