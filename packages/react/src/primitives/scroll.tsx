import type { CSSProperties, ReactNode } from 'react';

interface ScrollProps {
  direction?: 'vertical' | 'horizontal';
  maxHeight?: number | string;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

export function Scroll({ direction = 'vertical', maxHeight, style, className, children }: ScrollProps) {
  return (
    <div
      className={className}
      style={{
        overflow: direction === 'vertical' ? 'auto' : 'hidden',
        overflowX: direction === 'horizontal' ? 'auto' : 'hidden',
        ...(maxHeight ? { maxHeight } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
