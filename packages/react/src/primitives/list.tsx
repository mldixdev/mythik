import type { CSSProperties, ReactNode } from 'react';

interface ListProps {
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * List primitive — renders children in a vertical list.
 * Repeat/iteration is handled by the engine (repeat config),
 * so this component just wraps the rendered children.
 */
export function List({ style, children }: ListProps) {
  return (
    <div role="list" style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {children}
    </div>
  );
}
