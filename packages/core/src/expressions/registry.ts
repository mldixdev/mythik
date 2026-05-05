import type { ExpressionHandlerDefinition, ResolverContext } from '../types.js';

export interface ExpressionRegistry {
  register: (handler: ExpressionHandlerDefinition) => void;
  has: (key: string) => boolean;
  resolve: (expr: unknown, context: ResolverContext) => unknown;
}

function findExpressionKey(obj: Record<string, unknown>): string | null {
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) return key;
  }
  return null;
}

export function createExpressionRegistry(): ExpressionRegistry {
  const handlers = new Map<string, ExpressionHandlerDefinition>();

  function register(handler: ExpressionHandlerDefinition): void {
    handlers.set(handler.key, handler);
  }

  function has(key: string): boolean {
    return handlers.has(key);
  }

  function resolve(expr: unknown, context: ResolverContext): unknown {
    if (expr === null || expr === undefined) return expr;
    if (typeof expr !== 'object') return expr;
    if (Array.isArray(expr)) return expr;

    const obj = expr as Record<string, unknown>;
    const key = findExpressionKey(obj);

    if (key === null) return obj;

    const handler = handlers.get(key);
    if (!handler) {
      throw new Error(`No handler registered for expression key "${key}"`);
    }

    return handler.resolve(obj, context);
  }

  return { register, has, resolve };
}
