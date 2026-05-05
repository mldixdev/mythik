/**
 * MotionView — Reanimated-native replacement for MotiView.
 *
 * Takes motion props (from, animate, transition) and applies them using
 * react-native-reanimated shared values + withTiming/withSpring.
 *
 * Replaces Moti to avoid the 0.30 + Reanimated 3.17 worklet easing
 * incompatibility. Exit animations are deferred to RN V2.
 */
import React, { useEffect, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  type WithTimingConfig,
  type WithSpringConfig,
} from 'react-native-reanimated';

export interface MotionTransition {
  type?: 'timing' | 'spring';
  duration?: number;
  delay?: number;
  easing?: unknown;
  damping?: number;
  stiffness?: number;
  mass?: number;
}

interface MotionViewProps {
  from?: Record<string, unknown>;
  animate?: Record<string, unknown>;
  transition?: MotionTransition;
  style?: ViewStyle;
  children?: React.ReactNode;
  [key: string]: unknown;
}

/** Map string easing names or bezier objects to Reanimated Easing functions */
function resolveEasing(ease: unknown): ((t: number) => number) | undefined {
  if (!ease) return undefined;

  // String easing name
  if (typeof ease === 'string') {
    const map: Record<string, (t: number) => number> = {
      linear: Easing.linear,
      easeIn: Easing.in(Easing.ease),
      easeOut: Easing.out(Easing.ease),
      easeInOut: Easing.inOut(Easing.ease),
    };
    return map[ease];
  }

  // Cubic-bezier object from motion-adapter: { type: 'bezier', x1, y1, x2, y2 }
  if (typeof ease === 'object' && ease !== null && (ease as any).type === 'bezier') {
    const b = ease as { x1: number; y1: number; x2: number; y2: number };
    return Easing.bezier(b.x1, b.y1, b.x2, b.y2);
  }

  return undefined;
}

function normalizeProps(props?: Record<string, unknown>): Record<string, number> {
  if (!props) return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(props)) {
    const k = key === 'x' ? 'translateX' : key === 'y' ? 'translateY' : key;
    if (typeof value === 'number') {
      result[k] = value;
    } else if (typeof value === 'string' && k === 'rotate') {
      result[k] = parseFloat(value) || 0;
    }
  }
  return result;
}

export function MotionView({ from, animate, transition, style, children, ...rest }: MotionViewProps) {
  const fromNorm = useMemo(() => normalizeProps(from), [from]);
  const animNorm = useMemo(() => normalizeProps(animate), [animate]);

  const opacity = useSharedValue(fromNorm.opacity ?? animNorm.opacity ?? 1);
  const translateX = useSharedValue(fromNorm.translateX ?? animNorm.translateX ?? 0);
  const translateY = useSharedValue(fromNorm.translateY ?? animNorm.translateY ?? 0);
  const scale = useSharedValue(fromNorm.scale ?? animNorm.scale ?? 1);
  const rotate = useSharedValue(fromNorm.rotate ?? animNorm.rotate ?? 0);

  // Extract primitive values for stable deps
  const transType = transition?.type;
  const transDuration = transition?.duration;
  const transDelay = transition?.delay;
  const transEasing = transition?.easing;
  const transDamping = transition?.damping;
  const transStiffness = transition?.stiffness;
  const transMass = transition?.mass;

  useEffect(() => {
    const isSpring = transType === 'spring';
    const easing = resolveEasing(transEasing) ?? Easing.out(Easing.ease);
    const duration = transDuration ?? 300;
    const delay = transDelay ?? 0;

    const timingConfig: WithTimingConfig = { duration, easing };
    const springConfig: WithSpringConfig = {
      damping: transDamping ?? 15,
      stiffness: transStiffness ?? 150,
      mass: transMass ?? 1,
    };

    const doAnimate = (sv: { value: number }, target: number) => {
      const anim = isSpring ? withSpring(target, springConfig) : withTiming(target, timingConfig);
      sv.value = delay > 0 ? withDelay(delay, anim) : anim;
    };

    if (animNorm.opacity !== undefined) doAnimate(opacity, animNorm.opacity);
    if (animNorm.translateX !== undefined) doAnimate(translateX, animNorm.translateX);
    if (animNorm.translateY !== undefined) doAnimate(translateY, animNorm.translateY);
    if (animNorm.scale !== undefined) doAnimate(scale, animNorm.scale);
    if (animNorm.rotate !== undefined) doAnimate(rotate, animNorm.rotate);
  }, [animNorm, transType, transDuration, transDelay, transEasing, transDamping, transStiffness, transMass]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  // Filter out MotionView-specific props
  const { key, ...viewRest } = rest as any;

  return (
    <Animated.View style={[style, animatedStyle]} {...viewRest}>
      {children}
    </Animated.View>
  );
}
