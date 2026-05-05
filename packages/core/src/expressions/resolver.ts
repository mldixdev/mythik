import type { ResolverContext, ExpressionHandlerDefinition, ResolveFn } from '../types.js';
import type { StateStore } from '../state/store.js';
import { builtinHandlers } from './handlers/index.js';

export interface ResolverConfig {
  store: StateStore;
  computedFunctions?: Record<string, (args: Record<string, unknown>) => unknown>;
  tokens?: Record<string, unknown>;
  locale?: string;
  translations?: Record<string, Record<string, string>>;
  extraExpressionHandlers?: ExpressionHandlerDefinition[];
}

export interface Resolver {
  resolve: (expr: unknown, contextOverrides?: Partial<ResolverContext>) => unknown;
}

export function createResolver(config: ResolverConfig): Resolver {
  const handlers = new Map<string, ExpressionHandlerDefinition>();

  for (const handler of builtinHandlers) {
    handlers.set(handler.key, handler);
  }

  if (config.extraExpressionHandlers) {
    for (const handler of config.extraExpressionHandlers) {
      handlers.set(handler.key, handler);
    }
  }

  function resolve(expr: unknown, contextOverrides?: Partial<ResolverContext>): unknown {
    if (expr === null || expr === undefined) return expr;
    if (typeof expr !== 'object') return expr;
    if (Array.isArray(expr)) return expr;

    const obj = expr as Record<string, unknown>;
    // Find the first $-key that has a registered handler
    // (JSONB storage may reorder keys, e.g., $in before $let)
    const key = Object.keys(obj).find((k) => k.startsWith('$') && handlers.has(k));
    if (!key) {
      const anyDollarKey = Object.keys(obj).find((k) => k.startsWith('$'));
      if (anyDollarKey) {
        throw new Error(`No handler registered for expression key "${anyDollarKey}"`);
      }
      return obj;
    }

    const handler = handlers.get(key)!;

    const context: ResolverContext = {
      getState: (path) => config.store.get(path),
      setState: (path, value) => config.store.set(path, value),
      computedFunctions: config.computedFunctions,
      tokens: config.tokens,
      locale: config.locale,
      translations: config.translations,
      letBindings: contextOverrides?.letBindings ?? {},
      item: contextOverrides?.item,
      index: contextOverrides?.index,
      props: contextOverrides?.props,
      group: contextOverrides?.group,
      selection: contextOverrides?.selection,
    };

    // All handlers receive the resolve function for nested expression resolution
    const resolveFn: ResolveFn = (e: unknown, innerCtx?: ResolverContext) => {
      const overrides = innerCtx
        ? { ...contextOverrides, letBindings: innerCtx.letBindings }
        : contextOverrides;
      return resolve(e, overrides);
    };

    return handler.resolve(obj, context, resolveFn);
  }

  return { resolve };
}
