import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';
import { evaluateVisibility } from '../../visibility/evaluator.js';

/**
 * $and — evaluates to true if ALL conditions are truthy.
 * Works anywhere (props, styles, actions), not just in visible.
 *
 * Usage:
 *   { "$and": [{ "$state": "/form/name" }, { "$state": "/form/price" }] }
 *   → true only if both name and price have truthy values
 */
export const andHandler: ExpressionHandlerDefinition = {
  key: '$and',
  resolve(expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const conditions = expr.$and as unknown[];
    if (!Array.isArray(conditions)) return false;
    return conditions.every((cond) => evaluateVisibility(cond, resolve));
  },
};

/**
 * $or — evaluates to true if ANY condition is truthy.
 *
 * Usage:
 *   { "$or": [{ "$state": "/form/name", "eq": "" }, { "$state": "/form/price", "eq": "" }] }
 *   → true if name OR price is empty
 */
export const orHandler: ExpressionHandlerDefinition = {
  key: '$or',
  resolve(expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const conditions = expr.$or as unknown[];
    if (!Array.isArray(conditions)) return false;
    return conditions.some((cond) => evaluateVisibility(cond, resolve));
  },
};

/**
 * $not — inverts a boolean value.
 *
 * Usage:
 *   { "$not": { "$state": "/form/isValid" } }
 *   { "$not": { "$and": [...] } }
 */
export const notHandler: ExpressionHandlerDefinition = {
  key: '$not',
  resolve(expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const value = expr.$not;
    return !evaluateVisibility(value, resolve);
  },
};
