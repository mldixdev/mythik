import type { CSSProperties } from 'react';

interface SpacerProps {
  size?: number | string;
  direction?: 'vertical' | 'horizontal';
  style?: CSSProperties;
}

export function Spacer({ size = 16, direction = 'vertical', style }: SpacerProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        ...(direction === 'vertical' ? { height: size } : { width: size }),
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
