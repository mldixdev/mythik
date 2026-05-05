import type { CSSProperties } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface ToggleProps {
  checked?: boolean;
  label?: string;
  disabled?: boolean;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  onChange?: (checked: boolean) => void;
}

export function Toggle({ checked = false, label, disabled, style, _tokens, onChange }: ToggleProps) {
  const t = useDesignTokens(_tokens);
  const trackColor = checked ? t.colors.primary : t.colors.border;
  const thumbPosition = checked ? 20 : 2;

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: t.spacing.scale.sm, cursor: disabled ? 'default' : 'pointer', color: t.colors.text, ...style }}>
      <button
        role="switch" type="button" aria-checked={checked} disabled={disabled}
        onClick={() => onChange?.(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, backgroundColor: trackColor,
          border: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer',
          position: 'relative', transition: `background-color ${t.motion.duration.fast}ms`,
          opacity: disabled ? t.opacity.disabled : 1,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: thumbPosition, width: 20, height: 20,
          borderRadius: '50%', backgroundColor: '#fff', transition: `left ${t.motion.duration.fast}ms`,
          boxShadow: t.elevation.sm,
        }} />
      </button>
      {label && <span style={{ fontSize: t.typography.scale.md.fontSize, fontFamily: t.typography.fontFamily.base }}>{label}</span>}
    </label>
  );
}
