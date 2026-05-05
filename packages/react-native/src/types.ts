import type { ViewStyle, TextStyle, ImageStyle } from 'react-native';

/** Union of all RN style types */
export type NativeStyle = ViewStyle | TextStyle | ImageStyle;

/** Result of cssToNative translation */
export interface CssToNativeResult {
  style: NativeStyle;
  /** If true, the element needs a LinearGradient wrapper */
  needsGradient?: boolean;
  /** Parsed gradient value for LinearGradient component */
  gradientConfig?: { colors: string[]; start?: { x: number; y: number }; end?: { x: number; y: number } };
}

/** Animatable values that Reanimated can interpolate */
export type AnimatableValue = number | string | undefined;

/** Animation props translated from spec motion config */
export interface MotionAnimationProps {
  from?: Record<string, AnimatableValue>;
  animate?: Record<string, AnimatableValue>;
  exit?: Record<string, AnimatableValue>;
  transition?: MotionTransitionConfig;
  /** Shared layout animation ID — pass through from spec */
  layoutId?: string;
}

/** Easing value after translation — either a named string or bezier curve */
export type MotionEasing = string | { type: 'bezier'; x1: number; y1: number; x2: number; y2: number };

/** Transition config for MotionView (Reanimated-compatible) */
export interface MotionTransitionConfig {
  type?: 'timing' | 'spring';
  duration?: number;
  easing?: MotionEasing;
  delay?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
  /** V2: stagger delay between children animations */
  staggerChildren?: number;
  /** V2: delay before children start animating */
  delayChildren?: number;
}
