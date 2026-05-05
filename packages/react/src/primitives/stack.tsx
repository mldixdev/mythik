import type { CSSProperties, ReactNode } from 'react';

interface StackProps {
  direction?: 'vertical' | 'horizontal';
  gap?: number | string;
  align?: string;
  justify?: string;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

export function Stack({ direction = 'vertical', gap = 0, align, justify, style, className, children }: StackProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        gap,
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
