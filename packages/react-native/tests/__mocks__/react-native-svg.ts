// Mock for react-native-svg — returns plain View-like components.
// Used in Vitest environment where native module isn't available.
import React from 'react';
import { View } from 'react-native';

export const Svg = ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
  React.createElement(View, { ...(props as Record<string, unknown>), testID: 'Svg' }, children);

export const SvgXml = ({ xml, ...props }: { xml: string } & Record<string, unknown>) =>
  React.createElement(View, { ...(props as Record<string, unknown>), testID: 'SvgXml', 'data-xml': xml });

export const Defs = ({ children }: { children?: React.ReactNode }) => React.createElement(View, { testID: 'Defs' }, children);
export const Rect = (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'Rect' });
export const Circle = (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'Circle' });
export const Path = ({ animatedProps: _animatedProps, ...props }: Record<string, unknown>) => {
  // Reanimated's useAnimatedProps produces an object consumers spread onto an
  // animated SVG component via the `animatedProps` prop. On real devices the
  // prop flows through Reanimated's UI-thread updater; in the Vitest mock it
  // reaches a passthrough React component and React emits a "unknown DOM prop"
  // warning. Drop it here — this mock is the correct seam since the real
  // react-native-svg Path never has to spread animatedProps onto a DOM node.
  void _animatedProps;
  return React.createElement(View, { ...props, testID: 'Path' });
};
export const Line = (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'Line' });
export const G = ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
  React.createElement(View, { ...(props as Record<string, unknown>), testID: 'G' }, children);
export const Pattern = ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
  React.createElement(View, { ...(props as Record<string, unknown>), testID: 'Pattern' }, children);
export const LinearGradient = ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
  React.createElement(View, { ...(props as Record<string, unknown>), testID: 'LinearGradient' }, children);
export const RadialGradient = ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
  React.createElement(View, { ...(props as Record<string, unknown>), testID: 'RadialGradient' }, children);
export const Stop = (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'Stop' });
export const Filter = ({ children, ...props }: { children?: React.ReactNode } & Record<string, unknown>) =>
  React.createElement(View, { ...(props as Record<string, unknown>), testID: 'Filter' }, children);
export const FeTurbulence = (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'FeTurbulence' });

export default Svg;
