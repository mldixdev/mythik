import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface AccordionProps {
  title?: string;
  defaultOpen?: boolean;
  badge?: string | number | boolean;
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
  children?: ReactNode;
}

export function Accordion({ title = '', defaultOpen = false, badge, style, _tokens, children }: AccordionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const t = useDesignTokens(_tokens);

  const showBadge = badge !== undefined && badge !== 0 && badge !== '' && badge !== false;

  return (
    <div style={{ borderRadius: t.radius(t.shape.radius.md), color: t.colors.text, ...t.surface.card, ...style }}>
      <button
        type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: `${t.spacing.scale.sm + t.spacing.unit}px ${t.spacing.scale.md}px`, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          border: 'none', backgroundColor: 'transparent', color: 'inherit',
          cursor: 'pointer', fontSize: t.typography.scale.md.fontSize, fontWeight: t.typography.weight.medium, fontFamily: t.typography.fontFamily.base,
        }}
      >
        <span>{title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {showBadge && (
            <span
              data-badge
              style={{
                backgroundColor: t.colors.primary,
                color: '#fff',
                padding: badge === true ? '0' : '1px 8px',
                width: badge === true ? '8px' : undefined,
                height: badge === true ? '8px' : undefined,
                borderRadius: t.radius(t.shape.radius.full),
                fontSize: '0.75em',
                fontWeight: 600,
                display: 'inline-block',
              }}
            >
              {badge === true ? '' : badge}
            </span>
          )}
          <span style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: `transform ${t.motion.duration.fast}ms` }}>▼</span>
        </span>
      </button>
      {open && <div style={{ padding: `0 ${t.spacing.scale.md}px ${t.spacing.scale.md}px` }}>{children}</div>}
    </div>
  );
}
