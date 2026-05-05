import React from 'react';
import { ScrollView } from 'react-native';
import type { ViewStyle } from 'react-native';

interface ScrollProps {
  direction?: 'vertical' | 'horizontal';
  maxHeight?: number;
  showIndicators?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
  testID?: string;
}

export function Scroll({ direction = 'vertical', maxHeight, showIndicators = false, style, children, testID }: ScrollProps) {
  const scrollStyle: ViewStyle = { ...style };
  if (maxHeight !== undefined) scrollStyle.maxHeight = maxHeight;

  return (
    <ScrollView
      testID={testID}
      horizontal={direction === 'horizontal'}
      style={scrollStyle}
      showsVerticalScrollIndicator={showIndicators}
      showsHorizontalScrollIndicator={showIndicators}
    >
      {children}
    </ScrollView>
  );
}
