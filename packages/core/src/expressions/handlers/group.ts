import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';
import { getByPath, parsePointer } from '../../state/store.js';

/**
 * $group — access group context inside repeat.groupBy.
 *
 * Usage:
 *   { "$group": "key" }       → group key value
 *   { "$group": "count" }     → number of items in group
 *   { "$group": "index" }     → group index (0-based)
 *   { "$group": "items" }     → array of items in group
 *   { "$group": "sum", "field": "amount" }  → sum of field across group items (client-side only)
 *   { "$group": "avg", "field": "amount" }  → average of field
 *   { "$group": "min", "field": "amount" }  → minimum of field
 *   { "$group": "max", "field": "amount" }  → maximum of field
 *   { "$group": "subtotal.total" }          → dot-notation access to group object (pre-grouped)
 */
export const groupHandler: ExpressionHandlerDefinition = {
  key: '$group',
  resolve(
    expr: Record<string, unknown>,
    context: ResolverContext,
    _resolveFn?: ResolveFn,
  ): unknown {
    const group = (context as ResolverContext & { group?: GroupContext }).group;
    if (!group) {
      throw new Error('$group used outside of a repeat with groupBy context');
    }

    const op = expr.$group as string;

    switch (op) {
      case 'key':
        return group.key;
      case 'count':
        return group.items.length;
      case 'index':
        return group.index;
      case 'items':
        return group.items;

      // Aggregates — computed from items
      case 'sum': {
        const field = expr.field as string;
        if (!field) throw new Error('$group "sum" requires "field" property');
        return group.items.reduce((acc: number, item) => acc + (Number((item as Record<string, unknown>)[field]) || 0), 0);
      }
      case 'avg': {
        const field = expr.field as string;
        if (!field) throw new Error('$group "avg" requires "field" property');
        if (group.items.length === 0) return 0;
        const sum = group.items.reduce((acc: number, item) => acc + (Number((item as Record<string, unknown>)[field]) || 0), 0);
        return sum / group.items.length;
      }
      case 'min': {
        const field = expr.field as string;
        if (!field) throw new Error('$group "min" requires "field" property');
        if (group.items.length === 0) return 0;
        return Math.min(...group.items.map((item) => Number((item as Record<string, unknown>)[field]) || 0));
      }
      case 'max': {
        const field = expr.field as string;
        if (!field) throw new Error('$group "max" requires "field" property');
        if (group.items.length === 0) return 0;
        return Math.max(...group.items.map((item) => Number((item as Record<string, unknown>)[field]) || 0));
      }

      default: {
        // Dot-notation access to the group's raw data object (pre-grouped mode)
        if (op.includes('.')) {
          const segments = op.split('.');
          let current: unknown = group.raw;
          for (const seg of segments) {
            if (current === null || current === undefined || typeof current !== 'object') return undefined;
            current = (current as Record<string, unknown>)[seg];
          }
          return current;
        }
        // Direct key access on raw group object
        if (group.raw && typeof group.raw === 'object') {
          return (group.raw as Record<string, unknown>)[op];
        }
        return undefined;
      }
    }
  },
};

/** Group context passed to the resolver during repeat.groupBy rendering */
export interface GroupContext {
  key: unknown;
  items: unknown[];
  index: number;
  /** The raw group object (for pre-grouped mode) */
  raw?: unknown;
}
