import React from 'react';
import { View, Text, Switch } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface ToggleProps {
  checked?: boolean;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  onChange?: (checked: boolean) => void;
  testID?: string;
}

export function Toggle({ checked = false, label, disabled, style, _tokens, onChange, testID }: ToggleProps) {
  const t = useDesignTokens(_tokens);

  return (
    <View testID={testID} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.scale.sm, ...style }}>
      <Switch
        value={checked}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: t.colors.border, true: t.colors.primary }}
        thumbColor={t.colors.surface}
      />
      {label && <Text style={{ fontSize: t.typography.scale.md.fontSize, fontFamily: t.typography.fontFamily.base, color: t.colors.text }}>{label}</Text>}
    </View>
  );
}
