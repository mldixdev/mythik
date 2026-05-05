import type { ExpressionHandlerDefinition, ResolverContext } from '../../types.js';

/**
 * $bindState creates a two-way binding to a state path.
 * Returns the current value at the path. The renderer uses the path
 * to wire up onChange → setState automatically.
 */
export const bindStateHandler: ExpressionHandlerDefinition = {
  key: '$bindState',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const path = expr.$bindState as string;
    return context.getState(path);
  },
};

/**
 * $bindItem creates a two-way binding to a field in the current repeat item.
 * Returns the current value. The renderer uses the field name + item index
 * to wire up onChange.
 */
export const bindItemHandler: ExpressionHandlerDefinition = {
  key: '$bindItem',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const field = expr.$bindItem as string;
    if (context.item === undefined) {
      throw new Error('$bindItem used outside of a repeat context');
    }
    if (field === '') return context.item;
    return (context.item as Record<string, unknown>)[field];
  },
};

/**
 * $item reads a field from the current repeat item (read-only).
 */
export const itemHandler: ExpressionHandlerDefinition = {
  key: '$item',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const field = expr.$item as string;
    if (context.item === undefined) {
      throw new Error('$item used outside of a repeat context');
    }
    if (field === '') return context.item;
    return (context.item as Record<string, unknown>)[field];
  },
};

/**
 * $index returns the current repeat index.
 */
export const indexHandler: ExpressionHandlerDefinition = {
  key: '$index',
  resolve(_expr: Record<string, unknown>, context: ResolverContext): unknown {
    if (context.index === undefined) {
      throw new Error('$index used outside of a repeat context');
    }
    return context.index;
  },
};
