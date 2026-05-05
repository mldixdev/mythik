import React from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import type { ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useDesignTokens } from './use-design-tokens.js';
import { toViewStyle } from './surface-utils.js';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  options?: (string | SelectOption)[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  _tokens?: Record<string, unknown>;
  onChange?: (value: string) => void;
  testID?: string;
}

/** Normalize option: bare string → {value, label} */
function normalizeOption(opt: string | SelectOption): SelectOption {
  return typeof opt === 'string' ? { value: opt, label: opt } : opt;
}

export function Select({ value, options = [], placeholder = 'Select...', label, required, disabled, style, _tokens, onChange, testID }: SelectProps) {
  const t = useDesignTokens(_tokens);
  const [open, setOpen] = React.useState(false);
  const normalized = React.useMemo(() => options.map(normalizeOption), [options]);
  const selectedLabel = normalized.find(o => o.value === value)?.label ?? placeholder;

  return (
    <View style={{ gap: t.spacing.unit }}>
      {label && (
        <Text style={{ fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, color: t.colors.text }}>
          {label}
          {required && <Text style={{ color: t.colors.error }}> *</Text>}
        </Text>
      )}
      <Pressable
        testID={testID}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          padding: 12,
          borderRadius: t.shape.radius.md,
          opacity: disabled ? t.opacity.disabled : 1,
          ...toViewStyle(t.surface.input),
          ...style,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: t.typography.scale.sm.fontSize, fontFamily: t.typography.fontFamily.base, color: value ? t.colors.text : t.colors.textMuted, flex: 1 }}>{selectedLabel}</Text>
          <Text style={{ fontSize: t.typography.scale.xs.fontSize, color: t.colors.textMuted, marginLeft: t.spacing.scale.sm }}>▼</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: `rgba(0,0,0,${t.opacity.backdrop})`, justifyContent: 'center', padding: t.spacing.scale.lg }} onPress={() => setOpen(false)}>
          <View style={{ borderRadius: t.shape.radius.lg, maxHeight: 400, overflow: 'hidden', ...toViewStyle(t.surface.modal) }}>
            <FlatList
              data={normalized}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { onChange?.(item.value); setOpen(false); }}
                  style={{
                    padding: t.spacing.scale.md,
                    backgroundColor: item.value === value ? t.colors.primary + '10' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: t.typography.scale.md.fontSize, fontFamily: t.typography.fontFamily.base, color: t.colors.text }}>{item.label}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
