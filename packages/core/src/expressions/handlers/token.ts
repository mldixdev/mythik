import type { ExpressionHandlerDefinition, ResolverContext } from '../../types.js';
import { getByPath } from '../../state/store.js';
import { resolveTokens, type DesignTokens } from '../../design/tokens.js';

export const tokenHandler: ExpressionHandlerDefinition = {
  key: '$token',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const tokenPath = expr.$token as string;
    const multiply = expr.multiply as number | undefined;

    if (!context.tokens) {
      throw new Error(`$token "${tokenPath}" referenced but no tokens are configured`);
    }

    // Dynamic theme: resolve tokens with active mode from state
    let tokens = context.tokens;
    const theme = context.getState('/preferences/theme') as string | undefined;
    if (theme && (tokens as DesignTokens).modes?.[theme]) {
      tokens = resolveTokens(tokens as DesignTokens, theme);
    }

    // Token paths use dot notation: "colors.primary" → ["colors", "primary"]
    const segments = tokenPath.split('.');
    const value = getByPath(tokens, segments);

    if (value === undefined) {
      throw new Error(`Token "${tokenPath}" not found in design system`);
    }

    if (multiply !== undefined && typeof value === 'number') {
      return value * multiply;
    }

    // Auto-convert elevation objects to CSS boxShadow string
    if (typeof value === 'object' && value !== null && 'shadowOffset' in value && 'shadowOpacity' in value) {
      const e = value as { shadowOffset: [number, number]; shadowRadius: number; shadowOpacity: number; shadowColor: string };
      if (e.shadowOpacity === 0) return 'none';
      const hex = e.shadowColor.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `${e.shadowOffset[0]}px ${e.shadowOffset[1]}px ${e.shadowRadius}px rgba(${r},${g},${b},${e.shadowOpacity})`;
    }

    return value;
  },
};
