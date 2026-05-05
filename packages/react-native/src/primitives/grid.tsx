import React from 'react';
import { View, Dimensions } from 'react-native';
import type { ViewStyle, DimensionValue } from 'react-native';

interface GridProps {
  columns?: number;
  gap?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
  testID?: string;
}

export function Grid({ columns = 2, gap = 0, style, children, testID }: GridProps) {
  const childArray = React.Children.toArray(children);

  // Calculate item width accounting for gaps between columns.
  // Total gap space in a row = gap * (columns - 1).
  // Each item's share of gap to subtract = gap * (columns - 1) / columns.
  const screenWidth = Dimensions.get('window').width;
  const containerWidth = (style as Record<string, unknown>)?.width as number ?? screenWidth;
  const totalGapPerRow = gap * (columns - 1);
  const itemWidth = (containerWidth - totalGapPerRow) / columns;

  return (
    <View testID={testID} style={{ flexDirection: 'row', flexWrap: 'wrap', ...style }}>
      {childArray.map((child, i) => {
        const isLastInRow = (i + 1) % columns === 0;
        return (
          <View
            key={i}
            style={{
              width: itemWidth,
              marginRight: isLastInRow ? 0 : gap,
              marginBottom: gap,
            }}
          >
            {child}
          </View>
        );
      })}
    </View>
  );
}
