import React from 'react';
import { Pressable } from 'react-native';
import type { ViewStyle } from 'react-native';

interface TouchableProps {
  style?: ViewStyle;
  children?: React.ReactNode;
  onClick?: () => void;
  testID?: string;
}

export function Touchable({ style, children, onClick, testID }: TouchableProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onClick}
      accessibilityRole="button"
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        ...style,
      })}
    >
      {children}
    </Pressable>
  );
}
