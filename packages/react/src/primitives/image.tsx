import type { CSSProperties } from 'react';
import { useDesignTokens } from './use-design-tokens.js';

interface ImageProps {
  src?: string;
  alt?: string;
  aspectRatio?: number;
  placeholder?: string;
  overlay?: 'none' | 'gradient-bottom' | 'color-tint';
  style?: CSSProperties;
  _tokens?: Record<string, unknown>;
}

export function Image({ src, alt = '', aspectRatio, placeholder, overlay, style, _tokens }: ImageProps) {
  const t = useDesignTokens(_tokens);

  const cornersId = t.identity.images.corners ?? 'rounded';
  const borderRadius = style?.borderRadius ?? (
    cornersId === 'circle' ? '50%'
    : cornersId === 'square' ? 0
    : cornersId === 'match-card' ? t.radius(t.shape.radius.md)
    : 8
  );

  const identityBorder = t.identity.images.border ? `1px solid ${t.colors.border}` : undefined;

  const isCircle = cornersId === 'circle';

  // For circle: compute the height the image would have had, use that as circle diameter
  const circleSize = isCircle && style?.width && aspectRatio
    ? Math.round(Number(style.width) / aspectRatio)
    : undefined;

  const imgStyle: CSSProperties = {
    borderRadius,
    ...(identityBorder && !style?.border ? { border: identityBorder } : {}),
    ...(isCircle
      ? { aspectRatio: '1', objectFit: 'cover' as const, ...(circleSize ? { width: circleSize, height: circleSize } : {}) }
      : { ...(aspectRatio ? { aspectRatio: String(aspectRatio) } : {}), objectFit: 'cover' as const, width: '100%' }),
    display: 'block',
    ...style,
    ...(isCircle && circleSize ? { width: circleSize, height: circleSize } : {}),
  };

  const overlayType = overlay ?? (t.identity.images.overlay ?? 'none');

  if (!src && placeholder) {
    return <div style={{ ...imgStyle, backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{placeholder}</div>;
  }

  if (overlayType === 'none') {
    return <img src={src} alt={alt} style={imgStyle} />;
  }

  const overlayStyle: CSSProperties = overlayType === 'gradient-bottom'
    ? { position: 'absolute', inset: 0, borderRadius, background: 'linear-gradient(transparent 60%, rgba(0,0,0,0.4))', pointerEvents: 'none' }
    : { position: 'absolute', inset: 0, borderRadius, backgroundColor: `${t.colors.primary}26`, mixBlendMode: 'multiply', pointerEvents: 'none' };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <img src={src} alt={alt} style={imgStyle} />
      <div style={overlayStyle} />
    </div>
  );
}
