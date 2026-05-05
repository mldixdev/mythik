import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';
import { deepResolveExpressionValue } from '../deep-resolve.js';

function evaluateComparison(
  value: unknown,
  condition: Record<string, unknown>,
  resolveFn: ResolveFn,
): boolean {
  let result: boolean;

  if ('eq' in condition) {
    result = value === resolveFn(condition.eq);
  } else if ('neq' in condition) {
    result = value !== resolveFn(condition.neq);
  } else if ('gt' in condition) {
    result = (value as number) > (resolveFn(condition.gt) as number);
  } else if ('gte' in condition) {
    result = (value as number) >= (resolveFn(condition.gte) as number);
  } else if ('lt' in condition) {
    result = (value as number) < (resolveFn(condition.lt) as number);
  } else if ('lte' in condition) {
    result = (value as number) <= (resolveFn(condition.lte) as number);
  } else {
    result = Boolean(value);
  }

  if (condition.not === true) {
    result = !result;
  }

  return result;
}

export const condHandler: ExpressionHandlerDefinition = {
  key: '$cond',
  resolve(
    expr: Record<string, unknown>,
    context: ResolverContext,
    resolveFn?: ResolveFn,
  ): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const condExpr = expr.$cond;
    const thenExpr = expr.$then;
    const elseExpr = expr.$else;

    let condValue: unknown;
    let conditionObj: Record<string, unknown> = {};

    if (condExpr !== null && typeof condExpr === 'object' && !Array.isArray(condExpr)) {
      const condRecord = condExpr as Record<string, unknown>;
      const sourceKey = Object.keys(condRecord).find((k) => k.startsWith('$'));
      if (sourceKey) {
        condValue = resolve({ [sourceKey]: condRecord[sourceKey] });
        conditionObj = condRecord;
      } else {
        condValue = condExpr;
      }
    } else {
      condValue = resolve(condExpr);
    }

    const result = evaluateComparison(condValue, conditionObj, resolve);
    return deepResolveExpressionValue(result ? thenExpr : elseExpr, resolve);
  },
};
