import React from 'react';
import type { CSSProperties } from 'react';
import { resolveLabelStyle } from 'mythik';
import { useDesignTokens } from './use-design-tokens.js';

interface TextareaProps {
  value?: string;
  placeholder?: string;
  label?: string;
  rows?: number;
  disabled?: boolean;
  readOnly?: boolean;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  onChange?: (value: string) => void;
}

export function Textarea({ value = '', placeholder, label, rows = 3, disabled, readOnly, style, _tokens, onChange }: TextareaProps) {
  const t = useDesignTokens(_tokens);
  const [focused, setFocused] = React.useState(false);
  const color = style?.color as string ?? 'inherit';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: t.spacing.unit }}>
      {label && <label style={{ fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, fontFamily: t.typography.fontFamily.base, color, ...resolveLabelStyle(t.identity.labelStyle, t.colors.accent) }}>{label}</label>}
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          padding: `${t.spacing.scale.sm}px ${t.spacing.scale.sm + t.spacing.unit}px`,
          borderRadius: t.radius(t.shape.radius.md),
          fontSize: t.typography.scale.sm.fontSize,
          fontFamily: t.typography.fontFamily.base,
          color,
          resize: 'vertical',
          outline: 'none',
          transition: `border-color ${t.motion.duration.fast}ms ${t.motion.easing.default}, box-shadow ${t.motion.duration.fast}ms ${t.motion.easing.default}`,
          ...t.surface.input,
          ...(focused ? t.surface.inputFocus : {}),
          ...style,
        }}
      />
    </div>
  );
}
