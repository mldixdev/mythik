import React from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface ScreenProps {
  title?: string;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  children?: React.ReactNode;
  testID?: string;
}

/**
 * Screen layout primitive.
 * Wraps content in KeyboardAvoidingView for form inputs.
 * SafeAreaView wrapping is handled by MythikApp at the navigation level.
 */
export function Screen({ title, style, _tokens, children, testID }: ScreenProps) {
  const t = useDesignTokens(_tokens);

  return (
    <KeyboardAvoidingView
      testID={testID}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: t.colors.background, ...style }}
    >
      {title && (
        <View style={{ paddingHorizontal: t.spacing.scale.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
          <Text style={{ fontSize: t.typography.scale.lg.fontSize, fontWeight: t.typography.weight.bold, fontFamily: t.typography.fontFamily.heading, color: t.colors.text }}>{title}</Text>
        </View>
      )}
      <View style={{ flex: 1, padding: t.spacing.scale.lg }}>
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}
