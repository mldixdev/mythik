import type { ResolverContext, ResolveFn } from '../types.js';

/**
 * Evaluates a single comparison condition.
 * Supports: $state, $item, $index, $ref with eq/neq/gt/gte/lt/lte/not
 */
/** Comparison operator keys */
const COMPARISON_KEYS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'not']);

function evaluateSingle(
  condition: Record<string, unknown>,
  resolve: ResolveFn,
): boolean {
  // Find the $-key that represents the value source
  const exprKey = Object.keys(condition).find((k) => k.startsWith('$'));

  let value: unknown;
  if (exprKey) {
    // Build an expression object with the $-key and non-comparison properties
    const exprObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(condition)) {
      if (!COMPARISON_KEYS.has(k)) {
        exprObj[k] = v;
      }
    }
    value = resolve(exprObj);
  } else {
    value = condition;
  }

  // Apply comparison operators
  let result: boolean;
  if ('eq' in condition) result = value === resolve(condition.eq);
  else if ('neq' in condition) result = value !== resolve(condition.neq);
  else if ('gt' in condition) result = (value as number) > (resolve(condition.gt) as number);
  else if ('gte' in condition) result = (value as number) >= (resolve(condition.gte) as number);
  else if ('lt' in condition) result = (value as number) < (resolve(condition.lt) as number);
  else if ('lte' in condition) result = (value as number) <= (resolve(condition.lte) as number);
  else result = Boolean(value);

  return condition.not === true ? !result : result;
}

/**
 * Evaluate a visibility expression. Supports:
 * - boolean: true/false
 * - single condition: { $state: "/path", eq: "value" }
 * - array (implicit AND): [cond1, cond2]
 * - $and: { $and: [cond1, cond2] }
 * - $or: { $or: [cond1, cond2] }
 * - nested: { $or: [{ $and: [c1, c2] }, c3] }
 */
export function evaluateVisibility(
  expr: unknown,
  resolve: ResolveFn,
): boolean {
  if (expr === undefined || expr === null) return true;
  if (typeof expr === 'boolean') return expr;

  // Array = implicit AND
  if (Array.isArray(expr)) {
    return expr.every((item) => evaluateVisibility(item, resolve));
  }

  if (typeof expr !== 'object') return Boolean(expr);

  const obj = expr as Record<string, unknown>;

  // $or
  if ('$or' in obj) {
    const conditions = obj.$or as unknown[];
    return conditions.some((c) => evaluateVisibility(c, resolve));
  }

  // $and
  if ('$and' in obj) {
    const conditions = obj.$and as unknown[];
    return conditions.every((c) => evaluateVisibility(c, resolve));
  }

  // Single comparison condition
  return evaluateSingle(obj, resolve);
}
