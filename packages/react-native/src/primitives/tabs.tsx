import React, { useMemo } from 'react';
import { View, Pressable, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface TabItem {
  key: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  value?: string;
  items?: TabItem[];
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  children?: React.ReactNode;
  onChange?: (value: string) => void;
  testID?: string;
}

export function Tabs({ value, items = [], style, _tokens, children, onChange, testID }: TabsProps) {
  const t = useDesignTokens(_tokens);

  return (
    <View testID={testID} style={style}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.colors.border }}>
        {items.map((item) => {
          const isActive = item.key === value;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onChange?.(item.key)}
              style={{
                paddingVertical: 12,
                paddingHorizontal: t.spacing.scale.md,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? t.colors.primary : 'transparent',
              }}
            >
              <Text style={{
                fontSize: t.typography.scale.sm.fontSize,
                fontWeight: isActive ? t.typography.weight.semibold : t.typography.weight.normal,
                fontFamily: t.typography.fontFamily.base,
                color: isActive ? t.colors.primary : t.colors.textMuted,
              }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View accessibilityRole="tabpanel" style={{ flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
