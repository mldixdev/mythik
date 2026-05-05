import React, { useEffect, useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useDesignTokens } from './use-design-tokens.js';
import { toViewStyle } from './surface-utils.js';

interface AccordionProps {
  title?: string;
  defaultOpen?: boolean;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  children?: React.ReactNode;
  testID?: string;
}

export function Accordion({ title, defaultOpen = false, style, _tokens, children, testID }: AccordionProps) {
  const t = useDesignTokens(_tokens);
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useSharedValue(defaultOpen ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(
      open ? 180 : 0,
      { duration: 200, easing: Easing.inOut(Easing.ease) },
    );
  }, [open]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const cardBlur = t.surface.card.blur;
  const containerStyle: ViewStyle = { borderRadius: t.shape.radius.md, overflow: 'hidden', ...toViewStyle(t.surface.card), ...style };

  const inner = (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: t.spacing.scale.md, backgroundColor: t.colors.surface }}
      >
        <Text style={{ fontSize: t.typography.scale.md.fontSize, fontWeight: t.typography.weight.medium, fontFamily: t.typography.fontFamily.base, color: t.colors.text }}>{title}</Text>
        <Animated.View style={chevronStyle}>
          <Text style={{ fontSize: t.typography.scale.sm.fontSize, color: t.colors.textMuted }}>▼</Text>
        </Animated.View>
      </Pressable>
      {open && (
        <View style={{ padding: t.spacing.scale.md, borderTopWidth: 1, borderTopColor: t.colors.border }}>
          {children}
        </View>
      )}
    </>
  );

  return cardBlur ? (
    <BlurView testID={testID} intensity={cardBlur.radius * 5} tint="default" style={containerStyle}>
      {inner}
    </BlurView>
  ) : (
    <View testID={testID} style={containerStyle}>
      {inner}
    </View>
  );
}
