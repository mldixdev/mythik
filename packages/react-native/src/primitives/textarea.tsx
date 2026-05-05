import React, { useMemo } from 'react';
import { View, TextInput, Text } from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useDesignTokens } from './use-design-tokens.js';
import { toViewStyle } from './surface-utils.js';

interface TextareaProps {
  value?: string;
  placeholder?: string;
  label?: string;
  rows?: number;
  disabled?: boolean;
  readOnly?: boolean;
  style?: ViewStyle & TextStyle;
  _tokens?: Record<string, unknown>;
  onChange?: (value: string) => void;
  testID?: string;
}

export function Textarea({ value = '', placeholder, label, rows = 3, disabled, readOnly, style, _tokens, onChange, testID }: TextareaProps) {
  const t = useDesignTokens(_tokens);
  const [focused, setFocused] = React.useState(false);

  const inputBlur = t.surface.input.blur;
  const inputStyle = useMemo(() => ({
    padding: 12,
    borderRadius: t.shape.radius.md,
    fontSize: t.typography.scale.sm.fontSize,
    fontFamily: t.typography.fontFamily.base,
    color: t.colors.text,
    minHeight: rows * 24,
    ...toViewStyle(t.surface.input),
    ...style,
    ...(focused ? { borderColor: t.colors.primary } : {}),
    opacity: disabled ? t.opacity.disabled : 1,
  }), [focused, t, rows, disabled, style]);

  return (
    <View style={{ gap: t.spacing.unit }}>
      {label && <Text style={{ fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, fontFamily: t.typography.fontFamily.base, color: t.colors.text }}>{label}</Text>}
      {(() => {
        const field = (
          <TextInput
            testID={testID}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={t.colors.textMuted}
            multiline
            numberOfLines={rows}
            textAlignVertical="top"
            editable={!disabled && !readOnly}
            onChangeText={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={inputBlur ? { flex: 1, fontSize: t.typography.scale.sm.fontSize, fontFamily: t.typography.fontFamily.base, color: t.colors.text, minHeight: rows * 24 } : inputStyle}
          />
        );
        return inputBlur ? <BlurView intensity={inputBlur.radius * 5} tint="default" style={inputStyle}>{field}</BlurView> : field;
      })()}
    </View>
  );
}
