import type { CSSProperties, ReactNode } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface ButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  disabled?: boolean;
  style?: CSSProperties;
  className?: string;
  _tokens?: Record<string, unknown>;
  children?: ReactNode;
  onClick?: () => void;
}

export function Button({ label, variant = 'primary', disabled, style, className, _tokens, children, onClick }: ButtonProps) {
  const t = useDesignTokens(_tokens);

  const surfaceKey = variant === 'primary' || variant === 'destructive' ? 'buttonPrimary' : 'buttonSecondary';
  const surfaceBase = t.surface[surfaceKey];
  const variantOverrides: Record<string, CSSProperties> = {
    primary: {},
    secondary: {},
    destructive: { backgroundColor: t.colors.error, color: '#fff' },
    ghost: { backgroundColor: 'transparent', border: 'none', boxShadow: 'none' },
  };

  return (
    <button
      type="button" disabled={disabled} onClick={onClick} className={className}
      style={{
        padding: `${t.spacing.scale.sm}px ${t.spacing.scale.md}px`, borderRadius: t.radius(t.shape.radius.md), fontSize: t.typography.scale.sm.fontSize, fontWeight: t.typography.weight.medium, fontFamily: t.typography.fontFamily.base,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? t.opacity.disabled : 1,
        transition: `all ${t.motion.duration.fast}ms ${t.motion.easing.default}`, outline: 'none',
        ...surfaceBase, ...variantOverrides[variant],
        ...(variant === 'primary' && t.identity.gradients.buttons && !style?.background && !style?.backgroundColor && !style?.backgroundImage
          ? { backgroundImage: t.identity.gradients.buttons === 'soft'
              ? `linear-gradient(135deg in oklch, ${t.colors.primaryLight}, ${t.colors.accentLight})`
              : t.identity.gradients.buttons === 'muted'
              ? `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.accent})`
              : `linear-gradient(135deg in oklch, ${t.colors.primary}, ${t.colors.accent})` }
          : {}),
        ...style,
      }}
    >
      {label ?? children}
    </button>
  );
}
