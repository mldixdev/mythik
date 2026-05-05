import React from 'react';
import { View, Pressable, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface CheckboxProps {
  checked?: boolean;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  onChange?: (checked: boolean) => void;
  testID?: string;
}

export function Checkbox({ checked = false, label, disabled, style, _tokens, onChange, testID }: CheckboxProps) {
  const t = useDesignTokens(_tokens);

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => onChange?.(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.scale.sm, opacity: disabled ? t.opacity.disabled : 1, ...style }}
    >
      <View
        style={{
          width: 22, height: 22, borderRadius: t.shape.radius.sm,
          borderWidth: 2, borderColor: checked ? t.colors.primary : t.colors.border,
          backgroundColor: checked ? t.colors.primary : 'transparent',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked && <Text style={{ color: '#fff', fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.bold }}>✓</Text>}
      </View>
      {label && <Text style={{ fontSize: t.typography.scale.md.fontSize, fontFamily: t.typography.fontFamily.base, color: t.colors.text }}>{label}</Text>}
    </Pressable>
  );
}
