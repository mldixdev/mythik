import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useDesignTokens } from './use-design-tokens.js';

interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rect';
  width?: number | string;
  height?: number;
  count?: number;
  gap?: number;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  testID?: string;
}

function SkeletonBar({ itemStyle }: { itemStyle: ViewStyle }) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[itemStyle, animatedStyle]} />;
}

export function Skeleton({ variant = 'text', width, height = 16, count = 1, gap, style, _tokens, testID }: SkeletonProps) {
  const t = useDesignTokens(_tokens);
  const resolvedGap = gap ?? t.spacing.scale.sm;

  // Detect dark mode from surface color
  const isDark = useMemo(() => {
    const hex = t.colors.surface.replace('#', '');
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  }, [t.colors.surface]);

  const bgColor = isDark ? '#374151' : '#e5e7eb';

  const items = Array.from({ length: count }, (_, i) => {
    const itemStyle: ViewStyle = {
      backgroundColor: bgColor,
      borderRadius: variant === 'circle' ? (height / 2) : t.shape.radius.sm,
      height,
      width: variant === 'circle' ? height : (width as number ?? '100%' as unknown as number),
      ...style,
    };

    return <SkeletonBar key={i} itemStyle={itemStyle} />;
  });

  return (
    <View testID={testID} accessible={false} accessibilityLabel="Loading" style={{ gap: resolvedGap }}>
      {items}
    </View>
  );
}
