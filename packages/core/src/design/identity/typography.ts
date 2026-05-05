// Forge Identity System — Typography
import type { TypographyHierarchy, TypographyHierarchyResolved, TextDecoration, LabelStyle } from './types.js';

export function resolveTypographyHierarchy(hierarchy: TypographyHierarchy): TypographyHierarchyResolved {
  switch (hierarchy) {
    case 'dramatic': return { headingScale: 3, headingWeight: 800 };
    case 'uniform': return { headingScale: 1.3, headingWeight: 600 };
    case 'editorial': return { headingScale: 2.2, headingLetterSpacing: '-0.02em', headingWeight: 700 };
    case 'display': return { headingScale: 4, headingLetterSpacing: '-0.03em', headingWeight: 900 };
    case 'mono': return { headingScale: 1.5, headingWeight: 600, headingFontFamily: 'mono' };
    case 'contrast': return { headingScale: 2.5, headingLetterSpacing: '-0.01em', headingWeight: 300 };
  }
}

export function resolveTextDecoration(decoration: TextDecoration, accentColor?: string): Record<string, unknown> {
  const c = accentColor ?? '#000';
  switch (decoration) {
    case 'none': return {};
    case 'stroke': return { WebkitTextStroke: `1px ${c}`, paintOrder: 'stroke fill' };
    case 'underline-accent': return { borderBottom: `3px solid ${c}`, paddingBottom: '4px', width: 'fit-content' };
    case 'highlight': return { backgroundColor: `${c}20`, padding: '2px 8px', width: 'fit-content' };
    case 'overline': return { borderTop: `3px solid ${c}`, paddingTop: '8px', width: 'fit-content' };
    case 'shadow': return { textShadow: `3px 3px 0px ${c}` };
  }
}

/** Resolve one or many text decorations, merging their styles */
export function resolveTextDecorations(decoration: TextDecoration | TextDecoration[], accentColor?: string): Record<string, unknown> {
  if (typeof decoration === 'string') return resolveTextDecoration(decoration, accentColor);
  const filtered = decoration.filter(d => d !== 'none');
  if (filtered.length === 0) return {};
  let result: Record<string, unknown> = {};
  for (const d of filtered) {
    result = { ...result, ...resolveTextDecoration(d, accentColor) };
  }
  return result;
}

export function resolveLabelStyle(style: LabelStyle, accentColor?: string): Record<string, unknown> {
  switch (style) {
    case 'normal': return {};
    case 'uppercase': return { textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75em' };
    case 'accent-colored': return { color: accentColor ?? 'inherit' };
  }
}
