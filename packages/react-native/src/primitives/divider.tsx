import React from 'react';
import { View } from 'react-native';
import type { ViewStyle, DimensionValue } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface DividerProps {
  direction?: 'horizontal' | 'vertical';
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  testID?: string;
}

export function Divider({ direction = 'horizontal', style, _tokens, testID }: DividerProps) {
  const t = useDesignTokens(_tokens);

  const baseStyle: ViewStyle = direction === 'horizontal'
    ? { width: '100%' as DimensionValue, height: 1, backgroundColor: t.colors.border }
    : { width: 1, height: '100%' as DimensionValue, backgroundColor: t.colors.border };

  return <View accessibilityRole="separator" testID={testID} style={{ ...baseStyle, ...style }} />;
}
