import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';
import { deepResolveExpressionValue } from '../deep-resolve.js';

export interface LetBindingLookup {
  found: boolean;
  missingPath?: boolean;
  value: unknown;
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function resolveLetBindingPath(bindings: Record<string, unknown> | undefined, ref: string): LetBindingLookup {
  if (!bindings) return { found: false, value: undefined };
  if (hasOwn(bindings, ref)) return { found: true, value: bindings[ref] };

  const [root, ...segments] = ref.split('.');
  if (!root || segments.length === 0 || !hasOwn(bindings, root)) {
    return { found: false, value: undefined };
  }

  let value = bindings[root];
  for (const segment of segments) {
    if (value === null || value === undefined || typeof value !== 'object') {
      return { found: true, missingPath: true, value: undefined };
    }
    const record = value as Record<string, unknown>;
    if (!hasOwn(record, segment)) return { found: true, missingPath: true, value: undefined };
    value = record[segment];
  }

  return { found: true, value };
}

export const letHandler: ExpressionHandlerDefinition = {
  key: '$let',
  resolve(
    expr: Record<string, unknown>,
    context: ResolverContext,
    resolveFn?: ResolveFn,
  ): unknown {
    const resolve = resolveFn ?? ((e: unknown) => e);
    const rawBindings = expr.$let;
    const body = expr.$in;

    // Support both object { a: expr } and array [["a", expr]] format.
    // Array format preserves insertion order across JSONB storage.
    const entries: [string, unknown][] = Array.isArray(rawBindings)
      ? (rawBindings as [string, unknown][])
      : Object.entries(rawBindings as Record<string, unknown>);

    const resolvedBindings: Record<string, unknown> = { ...context.letBindings };
    for (const [name, valueExpr] of entries) {
      // Pass accumulated bindings so later bindings can $ref earlier ones
      const currentContext: ResolverContext = { ...context, letBindings: { ...resolvedBindings } };
      resolvedBindings[name] = resolve(valueExpr, currentContext);
    }

    const innerContext: ResolverContext = {
      ...context,
      letBindings: resolvedBindings,
    };

    return deepResolveExpressionValue(body, (value) => resolve(value, innerContext));
  },
};

export const refHandler: ExpressionHandlerDefinition = {
  key: '$ref',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const name = expr.$ref as string;
    const binding = resolveLetBindingPath(context.letBindings, name);
    if (!binding.found || binding.missingPath) {
      throw new Error(`$ref "${name}" is not defined in any $let scope`);
    }
    return binding.value;
  },
};
