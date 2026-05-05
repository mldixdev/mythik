import React from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

interface ListProps {
  style?: ViewStyle;
  children?: React.ReactNode;
  testID?: string;
}

/**
 * List container. Iteration/repeat is handled by the engine layer —
 * this component just provides the layout wrapper with list role.
 */
export function List({ style, children, testID }: ListProps) {
  return (
    <View testID={testID} accessibilityRole="list" style={{ flexDirection: 'column', ...style }}>
      {children}
    </View>
  );
}
