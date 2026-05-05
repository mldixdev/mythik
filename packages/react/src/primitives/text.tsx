import type { CSSProperties } from 'react';
import { resolveTypographyHierarchy, resolveTextDecorations, resolveLabelStyle } from 'mythik';
import { useDesignTokens } from './use-design-tokens.js';

interface TextProps {
  content?: string;
  variant?: 'heading' | 'body' | 'caption' | 'label' | 'mono';
  style?: CSSProperties;
  className?: string;
  _tokens?: Record<string, unknown>;
}

const VARIANT_TAGS = {
  heading: 'h2',
  body: 'p',
  caption: 'span',
  label: 'label',
  mono: 'code',
} as const;

export function Text({ content, variant = 'body', style, className, _tokens }: TextProps) {
  const t = useDesignTokens(_tokens);
  const Tag = VARIANT_TAGS[variant] ?? 'p';
  const ls = t.typography.letterSpacing ? `${t.typography.letterSpacing}em` : undefined;
  const hls = t.typography.headingLetterSpacing ? `${t.typography.headingLetterSpacing}em` : undefined;
  const typoH = resolveTypographyHierarchy(t.identity.typographyHierarchy);
  const headingDeco = resolveTextDecorations(t.identity.textDecoration, t.colors.accent);
  const labelDeco = resolveLabelStyle(t.identity.labelStyle, t.colors.accent);
  // Resolve heading color: 'default' = inherit, others map to scheme colors
  const hc = t.identity.headingColor;
  const headingColorCSS = hc === 'primary' ? t.colors.primary
    : hc === 'accent' ? t.colors.accent
    : hc === 'primary-dark' ? t.colors.primaryDark
    : 'inherit';

  const variantStyles: Record<string, CSSProperties> = {
    heading: {
      fontSize: Math.round(t.typography.scale.md.fontSize * typoH.headingScale),
      fontWeight: typoH.headingWeight,
      fontFamily: typoH.headingFontFamily === 'mono' ? t.typography.fontFamily.mono : t.typography.fontFamily.heading,
      letterSpacing: typoH.headingLetterSpacing ?? hls,
      color: headingColorCSS,
      ...headingDeco,
    },
    body: { fontSize: t.typography.scale.md.fontSize, fontWeight: t.typography.weight.normal, fontFamily: t.typography.fontFamily.base, lineHeight: `${t.typography.scale.md.lineHeight}px`, letterSpacing: ls, color: 'inherit' },
    caption: { fontSize: t.typography.scale.xs.fontSize, fontWeight: t.typography.weight.normal, opacity: t.opacity.muted, fontFamily: t.typography.fontFamily.base, letterSpacing: ls, color: 'inherit' },
    label: {
      fontSize: t.typography.scale.sm.fontSize,
      fontWeight: t.typography.weight.medium,
      fontFamily: t.typography.fontFamily.base,
      letterSpacing: ls,
      color: 'inherit',
      ...labelDeco,
    },
    mono: { fontSize: t.typography.scale.sm.fontSize, fontFamily: t.typography.fontFamily.mono, color: 'inherit' },
  };
  // Gradient text: 'vibrant' (OKLCH), 'soft' (OKLCH light tones), 'muted' (sRGB desaturated center), true='vibrant', false=off
  const gradientMode = t.identity.gradients.text;
  const useGradientText = variant === 'heading' && gradientMode && !style?.color && !style?.background && !style?.backgroundImage;
  const gradientColors = gradientMode === 'soft'
    ? `linear-gradient(135deg in oklch, ${t.colors.primaryLight}, ${t.colors.accentLight})`
    : gradientMode === 'muted'
    ? `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.accent})`
    : `linear-gradient(135deg in oklch, ${t.colors.primary}, ${t.colors.accent})`;
  // Use `backgroundImage` longhand instead of `background` shorthand so it
  // composes with consumer-provided `backgroundColor` cleanly (no React
  // shorthand/longhand conflict during rerender — see button.tsx).
  const gradientStyle: CSSProperties = useGradientText
    ? {
        backgroundImage: gradientColors,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
        width: 'fit-content',
      }
    : {};

  return <Tag style={{ ...variantStyles[variant], ...gradientStyle, ...style }} className={className}>{content}</Tag>;
}
