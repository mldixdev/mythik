import type { ExpressionHandlerDefinition, ResolverContext } from '../../types.js';

export const stateHandler: ExpressionHandlerDefinition = {
  key: '$state',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const path = expr.$state as string;
    return context.getState(path);
  },
};
