import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface IconProps {
  name?: string;
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  color?: string;
  style?: ViewStyle;
  container?: false;
  testID?: string;
  _tokens?: Record<string, unknown>;
}

/**
 * Default icon placeholder. Override via plugins.overridePrimitive('icon', ...)
 * to connect Phosphor, Lucide, or any icon library (same pattern as web).
 *
 * Identity-aware: reads t.identity.icons for weight default and container.
 * Spec-level props override identity defaults.
 */
export function Icon({ name, size = 24, weight, color, style, container, testID, _tokens }: IconProps) {
  const t = useDesignTokens(_tokens);

  const resolvedWeight = weight ?? t.identity.icons.weight ?? 'regular';

  const containerShape = container === false ? 'none' : (t.identity.icons.container ?? 'none');
  const containerColorKey = t.identity.icons.containerColor ?? 'primary';
  const containerBg = containerColorKey === 'primary' ? t.colors.primary
    : containerColorKey === 'accent' ? t.colors.accent
    : containerColorKey === 'muted' ? t.colors.border
    : t.colors.surface;

  const iconStyle = useMemo(
    () => ({
      width: size,
      height: size,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...style,
    }),
    [size, style],
  );

  const textStyle = useMemo(
    () => ({ fontSize: size * 0.4, color: color ?? '#64748b' }),
    [size, color],
  );

  const iconElement = (
    <View
      testID={testID}
      accessible={!!name}
      accessibilityLabel={name}
      accessibilityRole="image"
      style={iconStyle}
    >
      <Text style={textStyle} data-weight={resolvedWeight}>{name?.charAt(0) ?? '?'}</Text>
    </View>
  );

  if (containerShape === 'none') return iconElement;

  const padding = Math.round(size * 0.35);
  const containerRadius = containerShape === 'circle' ? (size + padding * 2) / 2
    : containerShape === 'square' ? 0
    : Math.round(size * 0.2);

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        borderRadius: containerRadius,
        backgroundColor: containerBg,
      }}
    >
      {iconElement}
    </View>
  );
}
