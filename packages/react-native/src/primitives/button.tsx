import React from 'react';
import { Pressable, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface ButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  children?: React.ReactNode;
  onClick?: () => void;
  testID?: string;
}

export function Button({ label, variant = 'primary', disabled, style, _tokens, children, onClick, testID }: ButtonProps) {
  const t = useDesignTokens(_tokens);

  const surfaceKey = variant === 'primary' || variant === 'destructive' ? 'buttonPrimary' : 'buttonSecondary';
  const surfaceBase = t.surface[surfaceKey];
  const variantOverrides: Record<string, ViewStyle> = {
    primary: {},
    secondary: {},
    destructive: { backgroundColor: t.colors.error },
    ghost: { backgroundColor: 'transparent', borderWidth: 0 },
  };

  const textColor = surfaceBase.color ?? (variant === 'secondary' || variant === 'ghost' ? t.colors.text : '#fff');

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onClick}
      style={({ pressed }) => ({
        paddingVertical: t.spacing.scale.sm + Math.round(t.spacing.unit / 2),
        paddingHorizontal: t.spacing.scale.md,
        borderRadius: t.shape.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? t.opacity.disabled : pressed ? t.opacity.pressed : 1,
        ...surfaceBase,
        ...variantOverrides[variant],
        ...style,
      })}
    >
      {label ? <Text style={{ fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, fontFamily: t.typography.fontFamily.base, color: textColor }}>{label}</Text> : children}
    </Pressable>
  );
}
