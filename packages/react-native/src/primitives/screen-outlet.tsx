import React from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

interface ScreenOutletProps {
  style?: ViewStyle;
  children?: React.ReactNode;
  testID?: string;
}

/**
 * Screen outlet for multi-screen apps.
 *
 * In V1, navigation is managed by AppEngine which updates /navigation/currentScreen
 * in the store. MythikApp subscribes to this and loads the corresponding spec.
 * The ScreenOutlet renders children directly — the parent MythikApp handles
 * screen switching at the top level.
 *
 * In V2, this will integrate with React Navigation's native navigators for
 * tab bars, drawers, and stack transitions.
 */
export function ScreenOutlet({ style, children, testID }: ScreenOutletProps) {
  return (
    <View testID={testID} style={{ flex: 1, ...style }}>
      {children}
    </View>
  );
}
