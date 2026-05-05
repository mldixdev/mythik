import type { CSSProperties } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface DividerProps {
  direction?: 'horizontal' | 'vertical';
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
}

export function Divider({ direction = 'horizontal', style, _tokens }: DividerProps) {
  const t = useDesignTokens(_tokens);

  const baseStyle: CSSProperties = direction === 'horizontal'
    ? { width: '100%', height: 1, backgroundColor: t.colors.border }
    : { width: 1, height: '100%', backgroundColor: t.colors.border };

  return <div role="separator" style={{ ...baseStyle, ...style }} />;
}
