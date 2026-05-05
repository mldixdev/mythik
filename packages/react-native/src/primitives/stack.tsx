import React from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

interface StackProps {
  direction?: 'vertical' | 'horizontal';
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  style?: ViewStyle;
  children?: React.ReactNode;
  testID?: string;
}

export function Stack({ direction = 'vertical', gap = 0, align, justify, style, children, testID }: StackProps) {
  return (
    <View
      testID={testID}
      style={{
        flexDirection: direction === 'horizontal' ? 'row' : 'column',
        ...(gap ? { gap } : undefined),
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
