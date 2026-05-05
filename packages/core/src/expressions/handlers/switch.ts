import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';
import { deepResolveExpressionValue } from '../deep-resolve.js';

/**
 * $switch — multi-branch conditional without nesting.
 *
 * Usage:
 *   { "$switch": { "$state": "/type" }, "cases": { "a": "Alpha", "b": "Beta" }, "default": "Other" }
 *
 * Resolution:
 *   1. Resolve $switch value
 *   2. Convert to string for case key lookup
 *   3. If cases[key] exists → resolve and return it (lazy — only matching case)
 *   4. Otherwise → resolve and return default
 */
export const switchHandler: ExpressionHandlerDefinition = {
  key: '$switch',
  resolve(
    expr: Record<string, unknown>,
    _context: ResolverContext,
    resolveFn?: ResolveFn,
  ): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);

    const switchValue = resolve(expr.$switch);
    const cases = expr.cases as Record<string, unknown> | undefined;
    const defaultExpr = expr.default;

    if (!cases || typeof cases !== 'object') {
      return deepResolveExpressionValue(defaultExpr, resolve);
    }

    const key = String(switchValue);

    if (key in cases) {
      return deepResolveExpressionValue(cases[key], resolve);
    }

    return deepResolveExpressionValue(defaultExpr, resolve);
  },
};
