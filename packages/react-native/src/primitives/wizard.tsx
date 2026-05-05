import React from 'react';
import { View, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface WizardProps {
  currentStep?: number;
  totalSteps?: number;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  children?: React.ReactNode;
  testID?: string;
}

export function Wizard({ currentStep = 0, totalSteps = 1, style, _tokens, children, testID }: WizardProps) {
  const t = useDesignTokens(_tokens);
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  return (
    <View testID={testID} style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.scale.md }}>
        <Text style={{ fontSize: t.typography.scale.sm.fontSize, color: t.colors.textMuted }}>
          Step {currentStep + 1} of {totalSteps}
        </Text>
      </View>
      <View style={{ height: 4, backgroundColor: t.colors.border, borderRadius: 2, marginBottom: t.spacing.scale.lg, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ flex: progress / 100, height: 4, backgroundColor: t.colors.primary, borderRadius: 2 }} />
      </View>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
