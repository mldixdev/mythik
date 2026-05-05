import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';

/**
 * $math — arithmetic operations without code.
 *
 * Usage:
 *   { "$math": "add", "args": [{ "$state": "/a" }, { "$state": "/b" }] }
 *   { "$math": "multiply", "args": [{ "$state": "/price" }, { "$state": "/qty" }] }
 *   { "$math": "round", "value": 3.14159, "decimals": 2 }
 *
 * Operations: add, subtract, multiply, divide, round, floor, ceil, abs, min, max, mod
 */
export const mathHandler: ExpressionHandlerDefinition = {
  key: '$math',
  resolve(expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const op = expr.$math as string;
    const args = expr.args as unknown[] | undefined;
    const value = expr.value !== undefined ? resolve(expr.value) as number : undefined;

    // Resolve all args — treat undefined/null/NaN as 0 to prevent NaN propagation
    const resolvedArgs = args ? args.map((a) => {
      const resolved = resolve(a);
      const num = Number(resolved);
      return Number.isNaN(num) ? 0 : num;
    }) : [];

    switch (op) {
      case 'add':
        return resolvedArgs.reduce((a, b) => a + b, 0);
      case 'subtract':
        return resolvedArgs.length >= 2 ? resolvedArgs[0] - resolvedArgs[1] : 0;
      case 'multiply':
        return resolvedArgs.reduce((a, b) => a * b, 1);
      case 'divide':
        return resolvedArgs.length >= 2 && resolvedArgs[1] !== 0
          ? resolvedArgs[0] / resolvedArgs[1]
          : 0;
      case 'mod':
        return resolvedArgs.length >= 2 ? resolvedArgs[0] % resolvedArgs[1] : 0;
      case 'round': {
        const v = value ?? resolvedArgs[0] ?? 0;
        const decimals = Number(expr.decimals ?? 0);
        const factor = Math.pow(10, decimals);
        return Math.round(v * factor) / factor;
      }
      case 'floor':
        return Math.floor(value ?? resolvedArgs[0] ?? 0);
      case 'ceil':
        return Math.ceil(value ?? resolvedArgs[0] ?? 0);
      case 'abs':
        return Math.abs(value ?? resolvedArgs[0] ?? 0);
      case 'min':
        return Math.min(...resolvedArgs);
      case 'max':
        return Math.max(...resolvedArgs);
      default:
        throw new Error(`Unknown $math operation: "${op}"`);
    }
  },
};
