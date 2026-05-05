import React, { useMemo } from 'react';
import { Text as RNText } from 'react-native';
import type { TextStyle } from 'react-native';
import { useDesignTokens } from './use-design-tokens.js';

interface TextProps {
  content?: string;
  variant?: 'heading' | 'body' | 'caption' | 'label' | 'mono';
  style?: TextStyle;
  _tokens?: Record<string, unknown>;
  testID?: string;
}

export function Text({ content, variant = 'body', style, _tokens, testID }: TextProps) {
  const t = useDesignTokens(_tokens);

  const hc = t.identity.headingColor;
  const headingColorRN = hc === 'primary' ? t.colors.primary
    : hc === 'accent' ? t.colors.accent
    : hc === 'primary-dark' ? t.colors.primaryDark
    : t.colors.text;

  const variantStyles: Record<string, TextStyle> = {
    heading: { fontSize: t.typography.scale.xl.fontSize, fontWeight: t.typography.weight.bold, fontFamily: t.typography.fontFamily.heading, color: headingColorRN },
    body: { fontSize: t.typography.scale.md.fontSize, fontWeight: t.typography.weight.normal, fontFamily: t.typography.fontFamily.base, color: t.colors.text },
    caption: { fontSize: t.typography.scale.xs.fontSize, fontWeight: t.typography.weight.normal, opacity: t.opacity.muted, color: t.colors.text },
    label: { fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, color: t.colors.text },
    mono: { fontSize: t.typography.scale.sm.fontSize, fontFamily: t.typography.fontFamily.mono, color: t.colors.text },
  };

  const mergedStyle = useMemo(
    () => ({ ...variantStyles[variant], ...style }),
    [variant, style, t],
  );

  return (
    <RNText
      testID={testID}
      accessibilityRole={variant === 'heading' ? 'header' : 'text'}
      style={mergedStyle}
    >
      {content}
    </RNText>
  );
}
