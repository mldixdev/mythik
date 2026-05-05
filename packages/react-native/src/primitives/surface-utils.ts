import type { ViewStyle } from 'react-native';
import type { RNSurfaceStyleProps } from 'mythik';

/** Strip non-RN-style props (blur, focusRing) from surface style props for safe spreading into style. */
export function toViewStyle(props: RNSurfaceStyleProps): ViewStyle {
  const { blur, focusRing, ...rest } = props as RNSurfaceStyleProps & Record<string, unknown>;
  return rest as ViewStyle;
}
