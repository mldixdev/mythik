import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';

export const computedHandler: ExpressionHandlerDefinition = {
  key: '$computed',
  resolve(
    expr: Record<string, unknown>,
    context: ResolverContext,
    resolveFn?: ResolveFn,
  ): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const fnName = expr.$computed as string;
    const argsExpr = expr.args as Record<string, unknown> | undefined;

    const fn = context.computedFunctions?.[fnName];
    if (!fn) {
      throw new Error(`Computed function "${fnName}" is not registered`);
    }

    const resolvedArgs: Record<string, unknown> = {};
    if (argsExpr) {
      for (const [key, value] of Object.entries(argsExpr)) {
        resolvedArgs[key] = resolve(value);
      }
    }

    return fn(resolvedArgs);
  },
};
