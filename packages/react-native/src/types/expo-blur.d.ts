declare module 'expo-blur' {
  import type { ComponentType } from 'react';
  import type { ViewProps } from 'react-native';

  export interface BlurViewProps extends ViewProps {
    intensity?: number;
    tint?: 'default' | 'light' | 'dark' | 'extraLight' | 'regular' | 'prominent';
    experimentalBlurMethod?: 'none' | 'dimezisBlurView';
  }

  export const BlurView: ComponentType<BlurViewProps>;
}
