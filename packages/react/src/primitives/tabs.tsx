import type { CSSProperties, ReactNode } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface TabItem {
  key: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  value?: string;
  items?: TabItem[];
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  children?: ReactNode;
  onChange?: (value: string) => void;
}

export function Tabs({ value, items = [], style, _tokens, children, onChange }: TabsProps) {
  const t = useDesignTokens(_tokens);

  return (
    <div style={style}>
      <div role="tablist" style={{ display: 'flex', borderBottom: `1px solid ${t.colors.border}`, gap: 0 }}>
        {items.map((item) => (
          <button
            key={item.key} role="tab" type="button" aria-selected={value === item.key}
            onClick={() => onChange?.(item.key)}
            style={{
              padding: `${t.spacing.scale.sm}px ${t.spacing.scale.md}px`, border: 'none',
              borderBottom: value === item.key ? `2px solid ${t.colors.primary}` : '2px solid transparent',
              backgroundColor: 'transparent',
              color: value === item.key ? t.colors.primary : t.colors.textMuted,
              cursor: 'pointer', fontWeight: value === item.key ? t.typography.weight.semibold : t.typography.weight.normal, fontSize: t.typography.scale.sm.fontSize, fontFamily: t.typography.fontFamily.base,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" style={{ paddingTop: t.spacing.scale.md }}>{children}</div>
    </div>
  );
}
