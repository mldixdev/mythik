import React from 'react';
import type { CSSProperties } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface IconProps {
  name?: string;
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  color?: string;
  style?: CSSProperties;
  container?: false;
  _tokens?: Record<string, unknown>;
}

/**
 * Generic icon primitive — renders a placeholder circle or a custom icon renderer.
 *
 * Custom icon renderers are registered via plugins.setIconRenderer(Component).
 * The renderer receives { name, size, weight, color, style } and renders the actual icon.
 * icon.tsx handles identity wrapping (container, weight default) regardless of renderer.
 *
 * Legacy: plugins.overridePrimitive('icon', ...) still works but bypasses identity features.
 */
export function Icon({ name = 'circle', size = 24, weight, color, style, container, _tokens }: IconProps) {
  const t = useDesignTokens(_tokens);

  const resolvedWeight = weight ?? t.identity.icons.weight ?? 'regular';

  const containerShape = container === false ? 'none' : (t.identity.icons.container ?? 'none');
  const containerColorKey = t.identity.icons.containerColor ?? 'primary';
  const containerBg = containerColorKey === 'primary' ? t.colors.primary
    : containerColorKey === 'accent' ? t.colors.accent
    : containerColorKey === 'muted' ? t.colors.border
    : t.colors.surface;

  // Use custom icon renderer if registered, otherwise placeholder
  const IconRenderer = (_tokens as Record<string, unknown> | undefined)?._iconRenderer as
    React.ComponentType<{ name: string; size: number; weight: string; color?: string; style?: CSSProperties }> | undefined;

  const iconElement = IconRenderer
    ? React.createElement(IconRenderer, { name, size, weight: resolvedWeight, color: color ?? 'inherit', style })
    : (
      <span
        role="img"
        aria-label={name}
        data-weight={resolvedWeight}
        style={{
          fontSize: size,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          color: color ?? 'inherit',
          ...style,
        }}
      >
        ●
      </span>
    );

  if (containerShape === 'none') return iconElement;

  const padding = Math.round(size * 0.35);
  const containerRadius = containerShape === 'circle' ? '50%'
    : containerShape === 'square' ? '0'
    : `${Math.round(size * 0.2)}px`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
        borderRadius: containerRadius,
        backgroundColor: containerBg,
      }}
    >
      {iconElement}
    </span>
  );
}
