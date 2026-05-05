import type { ExpressionHandlerDefinition, ResolverContext } from '../../types.js';

/**
 * $selection — access selection state inside repeat.selection.
 *
 * Usage:
 *   { "$selection": "selected" }  → true if current item is in selection array
 *   { "$selection": "count" }     → number of selected items
 */
export const selectionHandler: ExpressionHandlerDefinition = {
  key: '$selection',
  resolve(expr: Record<string, unknown>, context: ResolverContext): unknown {
    const operation = expr.$selection as string;
    if (!context.selection) {
      throw new Error('$selection used outside of a repeat with selection');
    }
    // `mode` is intentionally unused here — it affects the action layer (toggle behavior),
    // not the expression layer. The expression just reads selection state as-is.
    const { state, key } = context.selection;
    const selectedArray = (context.getState(state) as unknown[]) ?? [];
    switch (operation) {
      case 'selected': {
        if (!context.item) return false;
        const itemId = (context.item as Record<string, unknown>)[key];
        return selectedArray.includes(itemId);
      }
      case 'count':
        return selectedArray.length;
      default:
        throw new Error(`Unknown $selection operation: "${operation}"`);
    }
  },
};
