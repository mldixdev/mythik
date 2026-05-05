import type { ExpressionHandlerDefinition, ResolverContext } from '../../types.js';

/**
 * $prop references a prop from the element's own definition.
 * Used in Layer 3 (Element Composition) where custom elements
 * define props that are passed by the consumer and used in the render tree.
 *
 * Usage: { "$prop": "label" } → resolves to the value of the "label" prop
 */
export const propHandler: ExpressionHandlerDefinition = {
  key: '$prop',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const propName = expr.$prop as string;
    if (!context.props) {
      throw new Error(`$prop "${propName}" used but no props context available`);
    }
    return context.props[propName];
  },
};
