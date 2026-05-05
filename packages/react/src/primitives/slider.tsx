import type { CSSProperties } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface SliderProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  onChange?: (value: number) => void;
}

export function Slider({ value = 0, min = 0, max = 100, step = 1, label, disabled, style, _tokens, onChange }: SliderProps) {
  const t = useDesignTokens(_tokens);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: t.spacing.unit }}>
      {label && <label style={{ fontSize: t.typography.scale.sm.fontSize }}>{label}</label>}
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange?.(Number(e.target.value))}
        style={{ width: '100%', ...style }}
      />
    </div>
  );
}
