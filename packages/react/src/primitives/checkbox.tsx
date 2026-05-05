import React from 'react';
import type { CSSProperties } from 'react';
import { resolveLabelStyle } from 'mythik';
import { useDesignTokens } from './use-design-tokens.js';

interface CheckboxProps {
  checked?: boolean;
  label?: string;
  disabled?: boolean;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  onChange?: (checked: boolean) => void;
}

export function Checkbox({ checked = false, label, disabled, style, _tokens, onChange }: CheckboxProps) {
  const t = useDesignTokens(_tokens);
  const [focused, setFocused] = React.useState(false);

  // Unchecked: surface.input styles. Checked: preserve surface structure, fill with primary.
  // Border keeps its original color (not primary) so it remains visible against primary bg.
  const surfaceInput = t.surface.input;
  const boxBase = checked
    ? { ...surfaceInput, backgroundColor: t.colors.primary }
    : surfaceInput;

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: t.spacing.scale.sm, cursor: disabled ? 'default' : 'pointer', color: 'inherit', ...style }}>
      <div style={{
        position: 'relative', width: 20, height: 20, flexShrink: 0,
        borderRadius: t.radius(4),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: `all ${t.motion.duration.fast}ms ${t.motion.easing.default}`,
        opacity: disabled ? t.opacity.disabled : 1,
        ...boxBase,
        ...(focused ? t.surface.inputFocus : {}),
      }}>
        {checked && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        <input
          type="checkbox" checked={checked} disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: disabled ? 'default' : 'pointer', margin: 0 }}
        />
      </div>
      {label && <span style={{ fontSize: t.typography.scale.md.fontSize, fontFamily: t.typography.fontFamily.base, ...resolveLabelStyle(t.identity.labelStyle, t.colors.accent) }}>{label}</span>}
    </label>
  );
}
