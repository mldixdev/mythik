import React from 'react';
import type { CSSProperties } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rect';
  width?: string | number;
  height?: number;
  count?: number;
  gap?: number;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
}

function isDarkSurface(tokens?: Record<string, unknown>): boolean {
  const colors = tokens?.colors as Record<string, string> | undefined;
  const surface = colors?.surface;
  if (!surface || !surface.startsWith('#')) return false;
  const hex = surface.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
}

function SkeletonItem({ variant = 'rect', width, height = 16, className, style }: {
  variant: string;
  width?: string | number;
  height: number;
  className: string;
  style?: CSSProperties;
}): React.ReactElement {
  const isCircle = variant === 'circle';
  const isText = variant === 'text';

  const computedWidth = isCircle ? height : (width ?? '100%');
  const borderRadius = isCircle ? '50%' : `${isText ? 4 : 6}px`;

  return React.createElement('div', {
    className,
    style: {
      width: typeof computedWidth === 'number' ? `${computedWidth}px` : computedWidth,
      height: `${height}px`,
      borderRadius,
      ...style,
    },
  });
}

export function Skeleton({
  variant = 'rect',
  width,
  height = 16,
  count = 1,
  gap,
  style,
  _tokens,
}: SkeletonProps): React.ReactElement {
  const t = useDesignTokens(_tokens);
  const className = isDarkSurface(_tokens) ? 'sv-skeleton-dark' : 'sv-skeleton';
  const resolvedGap = gap ?? t.spacing.scale.sm;

  if (count === 1) {
    return React.createElement(SkeletonItem, { variant, width, height, className, style });
  }

  return React.createElement('div', {
    style: { display: 'flex', flexDirection: 'column' as const, gap: `${resolvedGap}px`, ...style },
  },
    Array.from({ length: count }, (_, i) =>
      React.createElement(SkeletonItem, { key: i, variant, width, height, className }),
    ),
  );
}
