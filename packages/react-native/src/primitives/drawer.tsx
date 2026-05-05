import React, { useEffect, useMemo } from 'react';
import { Modal, View, Pressable } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useDesignTokens } from './use-design-tokens.js';

interface DrawerProps {
  visible?: boolean;
  side?: 'left' | 'right';
  width?: number;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  _motion?: Record<string, unknown>;
  children?: React.ReactNode;
  onClose?: () => void;
  testID?: string;
}

export function Drawer({ visible = false, side = 'left', width = 280, style, _tokens, _motion, children, onClose, testID }: DrawerProps) {
  const t = useDesignTokens(_tokens);

  const drawerStyle = useMemo(() => ({
    position: 'absolute' as const,
    top: 0,
    bottom: 0,
    [side]: 0,
    width,
    backgroundColor: t.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: side === 'left' ? 4 : -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
    ...style,
  }), [side, width, t.colors.surface, style]);

  const slideFrom = side === 'left' ? -width : width;
  const translateX = useSharedValue(slideFrom);

  useEffect(() => {
    translateX.value = withTiming(
      visible ? 0 : slideFrom,
      { duration: 300, easing: Easing.out(Easing.ease) },
    );
  }, [visible, slideFrom]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          accessibilityLabel="Close drawer"
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: `rgba(0,0,0,${t.opacity.backdrop})` }}
          onPress={onClose}
        />
        <Animated.View
          testID={testID}
          style={[drawerStyle, animatedStyle]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
