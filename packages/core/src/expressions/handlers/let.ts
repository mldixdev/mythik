import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';

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

    return resolve(body, innerContext);
  },
};

export const refHandler: ExpressionHandlerDefinition = {
  key: '$ref',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const name = expr.$ref as string;
    const bindings = context.letBindings;
    if (!bindings || !(name in bindings)) {
      throw new Error(`$ref "${name}" is not defined in any $let scope`);
    }
    return bindings[name];
  },
};
