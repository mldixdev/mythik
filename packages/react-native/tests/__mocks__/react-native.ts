/**
 * Vitest mock for react-native.
 * Maps RN components to HTML equivalents so tests run without RN runtime.
 * Tests verify component logic, prop passing, and event handling — not visual rendering.
 */
import React from 'react';

// --- Layout Components ---
export const View = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
  ({ children, style, accessibilityRole, accessibilityLabel, testID, accessible, importantForAccessibility, accessibilityElementsHidden, ...rest }, ref) =>
    React.createElement('div', { ref, style, role: accessibilityRole, 'aria-label': accessibilityLabel, 'data-testid': testID, ...rest }, children)
);
View.displayName = 'View';

export const Text = React.forwardRef<HTMLSpanElement, Record<string, unknown>>(
  ({ children, style, accessibilityRole, testID, ...rest }, ref) =>
    React.createElement('span', { ref, style, role: accessibilityRole, 'data-testid': testID, ...rest }, children)
);
Text.displayName = 'Text';

export const ScrollView = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
  ({ children, style, horizontal, testID, showsVerticalScrollIndicator, showsHorizontalScrollIndicator, contentContainerStyle, bounces, ...rest }, ref) =>
    React.createElement('div', { ref, style: { ...style as object, overflow: 'auto' }, 'data-testid': testID, 'data-horizontal': horizontal, ...rest }, children)
);
ScrollView.displayName = 'ScrollView';

// --- Interactive Components ---
export const Pressable = React.forwardRef<HTMLButtonElement, Record<string, unknown>>(
  ({ children, onPress, disabled, style, testID, accessibilityRole, accessibilityState, accessibilityLabel, ...rest }, ref) => {
    const resolvedStyle = typeof style === 'function' ? style({ pressed: false }) : style;
    return React.createElement('button', {
      ref, onClick: onPress, disabled, style: resolvedStyle,
      role: accessibilityRole, 'aria-label': accessibilityLabel,
      'data-testid': testID, type: 'button', ...rest,
    }, children);
  }
);
Pressable.displayName = 'Pressable';

export const TouchableOpacity = Pressable;

// --- Form Components ---
export const TextInput = React.forwardRef<HTMLInputElement, Record<string, unknown>>(
  ({ value, onChangeText, onFocus, onBlur, onSubmitEditing, placeholder, placeholderTextColor, editable, secureTextEntry, multiline, numberOfLines, keyboardType, returnKeyType, textAlignVertical, style, testID, ...rest }, ref) =>
    React.createElement(multiline ? 'textarea' : 'input', {
      ref, value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChangeText?.(e.target.value),
      onFocus, onBlur, onKeyDown: onSubmitEditing ? (e: React.KeyboardEvent) => { if (e.key === 'Enter') onSubmitEditing(); } : undefined,
      placeholder, disabled: editable === false, type: secureTextEntry ? 'password' : 'text',
      rows: multiline ? numberOfLines : undefined,
      style, 'data-testid': testID, 'data-keyboard-type': keyboardType, ...rest,
    })
);
TextInput.displayName = 'TextInput';

export const Switch = ({ value, onValueChange, disabled, trackColor, thumbColor, testID, ...rest }: Record<string, unknown>) =>
  React.createElement('input', {
    type: 'checkbox', checked: value, onChange: () => onValueChange?.(!value),
    disabled, 'data-testid': testID, ...rest,
  });

// --- Media Components ---
export const Image = ({ source, style, accessibilityLabel, resizeMode, testID, accessible, ...rest }: Record<string, unknown>) =>
  React.createElement('img', {
    src: (source as Record<string, string>)?.uri, alt: accessibilityLabel,
    style: { ...style as object, objectFit: resizeMode }, 'data-testid': testID, ...rest,
  });

// --- Overlay Components ---
export const Modal = ({ visible, children, transparent, animationType, onRequestClose, testID, ...rest }: Record<string, unknown>) =>
  visible ? React.createElement('div', {
    role: 'dialog', 'aria-modal': true, 'data-testid': testID,
    'data-transparent': transparent, 'data-animation': animationType, ...rest,
  }, children) : null;

export const FlatList = ({ data, renderItem, keyExtractor, ListEmptyComponent, testID, ...rest }: Record<string, unknown>) => {
  const items = data as unknown[] ?? [];
  if (items.length === 0 && ListEmptyComponent) {
    return React.createElement('div', { 'data-testid': testID, ...rest }, React.createElement(ListEmptyComponent as React.ComponentType));
  }
  return React.createElement('div', { 'data-testid': testID, role: 'list', ...rest },
    items.map((item, index) =>
      React.createElement('div', { key: keyExtractor ? (keyExtractor as (item: unknown, index: number) => string)(item, index) : index, role: 'listitem' },
        (renderItem as (info: { item: unknown; index: number }) => React.ReactNode)({ item, index })
      )
    )
  );
};

// --- Utilities ---
export const Platform = { OS: 'ios' as const, select: (opts: Record<string, unknown>) => opts.ios ?? opts.default };
export const Dimensions = {
  get: (_: string) => ({ width: 390, height: 844 }),
  addEventListener: (_event: string, _handler: () => void) => ({ remove: () => {} }),
};
export const Appearance = {
  getColorScheme: () => 'light' as const,
  addChangeListener: (_cb: unknown) => ({ remove: () => {} }),
};
export const PixelRatio = { get: () => 3 };
export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  flatten: (style: unknown) => (Array.isArray(style) ? Object.assign({}, ...style) : style),
};
export const Linking = { openURL: async (_url: string) => {} };
export const Share = { share: async (_opts: Record<string, unknown>) => ({ action: 'sharedAction' }) };
export const Keyboard = { dismiss: () => {} };
export const KeyboardAvoidingView = React.forwardRef<HTMLDivElement, Record<string, unknown>>(
  ({ children, style, testID, behavior, keyboardVerticalOffset, ...rest }, ref) =>
    React.createElement('div', { ref, style, 'data-testid': testID }, children)
);
KeyboardAvoidingView.displayName = 'KeyboardAvoidingView';
export const SafeAreaView = View;
export const ActivityIndicator = ({ testID, ...rest }: Record<string, unknown>) =>
  React.createElement('div', { 'data-testid': testID, role: 'progressbar', ...rest });

export const AccessibilityInfo = {
  isReduceMotionEnabled: async () => false,
  isScreenReaderEnabled: async () => false,
  addEventListener: (_event: string, _cb: (v: boolean) => void) => ({ remove: () => {} }),
  announceForAccessibility: (_msg: string) => {},
  setAccessibilityFocus: (_tag: number) => {},
};
