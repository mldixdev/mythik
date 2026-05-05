import React, { useMemo } from 'react';
import { View, TextInput, Text } from 'react-native';
import type { ViewStyle, TextStyle, KeyboardTypeOptions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useDesignTokens } from './use-design-tokens.js';
import { toViewStyle } from './surface-utils.js';

interface InputProps {
  value?: string | number;
  type?: 'text' | 'number' | 'email' | 'password' | 'phone' | 'url' | 'date';
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  format?: 'phone' | 'currency' | 'none';
  formatOptions?: { locale?: string; currency?: string };
  checks?: Array<{ type: string; message?: string; args?: Record<string, unknown> }>;
  validateOn?: 'change' | 'blur' | 'submit';
  style?: ViewStyle & TextStyle;
  _tokens?: Record<string, unknown>;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  testID?: string;
}

const KEYBOARD_MAP: Record<string, KeyboardTypeOptions> = {
  number: 'numeric',
  email: 'email-address',
  phone: 'phone-pad',
  url: 'url',
};

function formatPhone(str: string): string {
  const digits = str.replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return str;
}

export function Input({
  value = '', type = 'text', placeholder, label, disabled, readOnly, required,
  format, style, _tokens, onChange, onSubmit, testID,
}: InputProps) {
  const t = useDesignTokens(_tokens);
  const [focused, setFocused] = React.useState(false);

  const displayValue = format === 'phone' ? formatPhone(String(value)) : String(value);

  const inputBlur = t.surface.input.blur;
  const inputStyle = useMemo(() => ({
    padding: 12,
    borderRadius: t.shape.radius.md,
    fontSize: t.typography.scale.sm.fontSize,
    fontFamily: t.typography.fontFamily.base,
    color: t.colors.text,
    ...toViewStyle(t.surface.input),
    ...style,
    ...(focused ? { borderColor: t.colors.primary } : {}),
    opacity: disabled ? t.opacity.disabled : 1,
  }), [focused, style, t, disabled]);

  return (
    <View style={{ gap: t.spacing.unit }}>
      {label && (
        <Text style={{ fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, fontFamily: t.typography.fontFamily.base, color: t.colors.text }}>
          {label}
          {required && <Text style={{ color: t.colors.error }}> *</Text>}
        </Text>
      )}
      {(() => {
        const field = (
          <TextInput
            testID={testID}
            value={displayValue}
            placeholder={placeholder}
            placeholderTextColor={t.colors.textMuted}
            editable={!disabled && !readOnly}
            secureTextEntry={type === 'password'}
            keyboardType={KEYBOARD_MAP[type] ?? 'default'}
            onChangeText={(text) => {
              const raw = format === 'phone' ? text.replace(/\D/g, '') : text;
              onChange?.(raw);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={onSubmit}
            returnKeyType={onSubmit ? 'done' : undefined}
            style={inputBlur ? { flex: 1, fontSize: t.typography.scale.sm.fontSize, fontFamily: t.typography.fontFamily.base, color: t.colors.text } : inputStyle}
          />
        );
        return inputBlur ? <BlurView intensity={inputBlur.radius * 5} tint="default" style={inputStyle}>{field}</BlurView> : field;
      })()}
    </View>
  );
}
