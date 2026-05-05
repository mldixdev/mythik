import React, { useMemo, useState } from 'react';
import type { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { ANIMATION_RECIPES } from 'mythik';
import type { ElementAnimations } from 'mythik';
import { useDesignTokens } from './use-design-tokens.js';
import { useElementAnimations } from '../animation/useElementAnimations.js';

interface BoxProps {
  surface?: 'card' | 'modal';
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  children?: React.ReactNode;
  testID?: string;
  animations?: ElementAnimations | null;
  animationStaggerIndex?: number;
  // Native event hooks (RN-native names). `onPressIn`/`onPressOut` require
  // the consumer to wrap Box in a Pressable for native firing (bare View
  // does not emit press events). Hover works via onHoverIn/Out on Fabric.
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

function compose(
  a: (() => void) | undefined,
  b: () => void,
): () => void {
  return () => {
    b();
    a?.();
  };
}

export function Box({
  surface,
  style,
  _tokens,
  children,
  testID,
  animations,
  animationStaggerIndex,
  onHoverIn,
  onHoverOut,
  onPressIn,
  onPressOut,
  onFocus,
  onBlur,
}: BoxProps) {
  const [isHovered, setHovered] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const [isActive, setActive] = useState(false);

  const { animatedStyle } = useElementAnimations(animations ?? undefined, {
    recipes: ANIMATION_RECIPES,
    staggerIndex: animationStaggerIndex,
    isHovered,
    isFocused,
    isActive,
  });

  const handlers = useMemo(
    () => ({
      onHoverIn: compose(onHoverIn, () => setHovered(true)),
      onHoverOut: compose(onHoverOut, () => setHovered(false)),
      onPressIn: compose(onPressIn, () => setActive(true)),
      onPressOut: compose(onPressOut, () => setActive(false)),
      onFocus: compose(onFocus, () => setFocused(true)),
      onBlur: compose(onBlur, () => setFocused(false)),
    }),
    [onHoverIn, onHoverOut, onPressIn, onPressOut, onFocus, onBlur],
  );

  // Hoisted above the early return so hook call count is stable even when
  // `surface` toggles between renders (Rules of Hooks). Cost is negligible
  // when `_tokens` is undefined — the hook short-circuits.
  const t = useDesignTokens(_tokens);

  // Always use Animated.View as root so the component identity is stable
  // across renders where `animations` toggles — switching View ↔ Animated.View
  // would force unmount/remount. When animations is absent the hook returns
  // an empty animatedStyle and Reanimated overhead is negligible.
  //
  // Style-merge contract: animatedStyle is intentionally LAST in the array,
  // so properties the animation touches (opacity, transform, etc.) override
  // the user's `style` during animation. User style wins for properties the
  // animation does not write — a deliberate design trade-off that keeps
  // animations visually reliable.
  if (!surface) {
    return (
      <Animated.View style={[style, animatedStyle]} testID={testID} {...handlers}>
        {children}
      </Animated.View>
    );
  }

  const surfaceStyles = t.surface[surface];

  return (
    <Animated.View
      style={[
        { borderRadius: t.shape.radius.md },
        surfaceStyles,
        style,
        animatedStyle,
      ]}
      testID={testID}
      {...handlers}
    >
      {children}
    </Animated.View>
  );
}
