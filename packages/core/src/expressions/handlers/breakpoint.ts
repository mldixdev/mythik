import type { ExpressionHandlerDefinition, ResolverContext } from '../../types.js';

/**
 * $breakpoint resolves responsive values based on current viewport width.
 * The viewport width comes from context (set by the renderer).
 * Falls back to the smallest breakpoint if no viewport info available.
 *
 * Usage: { "$breakpoint": { "sm": 1, "md": 2, "lg": 3 } }
 */
export const breakpointHandler: ExpressionHandlerDefinition = {
  key: '$breakpoint',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const breakpointValues = expr.$breakpoint as Record<string, unknown>;

    // Get breakpoint definitions from tokens, or use defaults
    const breakpoints: Record<string, number> = (context.tokens?.breakpoints as Record<string, number>) ?? {
      sm: 0,
      md: 768,
      lg: 1024,
      xl: 1280,
    };

    // Get current viewport width: new standard path first, legacy fallback, then default
    const viewportWidth = (context.getState('/ui/device/viewportWidth') as number)
      ?? (context.getState('/ui/viewportWidth') as number)
      ?? 1024;

    // Sort breakpoints by width descending, find the first one that fits
    const sorted = Object.entries(breakpoints)
      .sort(([, a], [, b]) => b - a);

    for (const [name, minWidth] of sorted) {
      if (viewportWidth >= minWidth && name in breakpointValues) {
        return breakpointValues[name];
      }
    }

    // Fallback: return the smallest breakpoint value
    const smallest = sorted[sorted.length - 1];
    if (smallest && smallest[0] in breakpointValues) {
      return breakpointValues[smallest[0]];
    }

    return undefined;
  },
};
