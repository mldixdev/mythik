import React from 'react';
import { View, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import RNSlider from '@react-native-community/slider';
import { useDesignTokens } from './use-design-tokens.js';

interface SliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  onChange?: (value: number) => void;
  testID?: string;
}

export function Slider({ value = 0, min = 0, max = 100, step = 1, label, disabled, style, _tokens, onChange, testID }: SliderProps) {
  const t = useDesignTokens(_tokens);

  return (
    <View testID={testID} style={{ gap: t.spacing.unit, ...style }}>
      {label && <Text style={{ fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, color: t.colors.text }}>{label}</Text>}
      <RNSlider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={t.colors.primary}
        maximumTrackTintColor={t.colors.border}
        thumbTintColor={t.colors.primary}
        onValueChange={onChange}
      />
    </View>
  );
}
