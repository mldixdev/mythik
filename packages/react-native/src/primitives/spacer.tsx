import React from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

interface SpacerProps {
  size?: number;
  direction?: 'vertical' | 'horizontal';
  style?: ViewStyle;
  testID?: string;
}

export function Spacer({ size = 16, direction = 'vertical', style, testID }: SpacerProps) {
  return (
    <View
      testID={testID}
      accessible={false}
      importantForAccessibility="no"
      style={{
        ...(direction === 'vertical' ? { height: size } : { width: size }),
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
