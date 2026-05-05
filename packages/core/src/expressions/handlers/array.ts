import type { ExpressionHandlerDefinition, ResolverContext, ResolveFn } from '../../types.js';
import { deepResolveExpressionValue } from '../deep-resolve.js';

/**
 * $array - array operations without code.
 *
 * Usage:
 *   { "$array": "count", "source": { "$state": "/products" } }
 *   { "$array": "sum", "source": { "$state": "/products" }, "field": "price" }
 *   { "$array": "filter", "source": { "$state": "/products" }, "where": { "field": "stock", "lt": 10 } }
 *   { "$array": "append", "source": { "$state": "/items" }, "value": { "name": "New" } }
 *   { "$array": "remove", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 3 } }
 *   { "$array": "map", "source": { "$state": "/items" }, "field": "name" }
 *   { "$array": "find", "source": { "$state": "/items" }, "where": { "field": "id", "eq": 1 } }
 *   { "$array": "includes", "source": { "$state": "/tags" }, "value": "urgent" }
 *   { "$array": "sort", "source": { "$state": "/items" }, "field": "name", "direction": "asc" }
 *   { "$array": "first", "source": { "$state": "/items" } }
 *   { "$array": "last", "source": { "$state": "/items" } }
 */
export const arrayHandler: ExpressionHandlerDefinition = {
  key: '$array',
  resolve(expr: Record<string, unknown>, context: ResolverContext, resolveFn?: ResolveFn): unknown {
    void context;
    const resolve = resolveFn ?? ((e: unknown) => e);
    const op = expr.$array as string;
    const source = resolve(expr.source) as unknown[];
    const field = expr.field as string | undefined;
    const where = expr.where as { field: string; eq?: unknown; neq?: unknown; lt?: unknown; lte?: unknown; gt?: unknown; gte?: unknown; in?: unknown; notIn?: unknown } | undefined;

    if (!Array.isArray(source)) return op === 'count' ? 0 : [];

    function matchesWhere(item: Record<string, unknown>): boolean {
      if (!where) return true;
      const val = item[where.field];
      if ('eq' in where) return val === resolve(where.eq);
      if ('neq' in where) return val !== resolve(where.neq);
      if ('lt' in where) return (val as number) < (resolve(where.lt) as number);
      if ('lte' in where) return (val as number) <= (resolve(where.lte) as number);
      if ('gt' in where) return (val as number) > (resolve(where.gt) as number);
      if ('gte' in where) return (val as number) >= (resolve(where.gte) as number);
      if ('in' in where) {
        const list = resolve(where.in) as unknown[];
        return Array.isArray(list) && list.includes(val);
      }
      if ('notIn' in where) {
        const list = resolve(where.notIn) as unknown[];
        return !Array.isArray(list) || !list.includes(val);
      }
      return true;
    }

    switch (op) {
      case 'count':
        return where
          ? source.filter((item) => matchesWhere(item as Record<string, unknown>)).length
          : source.length;

      case 'sum': {
        if (!field) return 0;
        const items = where ? source.filter((i) => matchesWhere(i as Record<string, unknown>)) : source;
        return items.reduce((acc: number, item) => acc + (Number((item as Record<string, unknown>)[field]) || 0), 0);
      }

      case 'sumProduct': {
        const field1 = expr.field1 as string;
        const field2 = expr.field2 as string;
        if (!field1 || !field2) return 0;
        return source.reduce((acc: number, item) => {
          const rec = item as Record<string, unknown>;
          return acc + (Number(rec[field1]) || 0) * (Number(rec[field2]) || 0);
        }, 0);
      }

      case 'filter':
        return where
          ? source.filter((item) => matchesWhere(item as Record<string, unknown>))
          : source;

      case 'remove':
        return where
          ? source.filter((item) => !matchesWhere(item as Record<string, unknown>))
          : source;

      case 'replace': {
        if (!where) return source;
        const replaceValue = deepResolveExpressionValue(expr.value, resolve) as Record<string, unknown>;
        return source.map((item) => {
          if (matchesWhere(item as Record<string, unknown>)) {
            return { ...(item as Record<string, unknown>), ...replaceValue };
          }
          return item;
        });
      }

      case 'append': {
        const value = deepResolveExpressionValue(expr.value, resolve);
        return [...source, value];
      }

      case 'map':
        return field
          ? source.map((item) => (item as Record<string, unknown>)[field])
          : source;

      case 'find':
        return where
          ? source.find((item) => matchesWhere(item as Record<string, unknown>))
          : undefined;

      case 'toggle': {
        const value = resolve(expr.value);
        return source.includes(value)
          ? source.filter((item) => item !== value)
          : [...source, value];
      }

      case 'search': {
        const query = String(resolve(expr.query) ?? '').toLowerCase();
        const fields = expr.fields as string[] | undefined;
        if (!query) return source;
        return source.filter((item) => {
          const rec = item as Record<string, unknown>;
          const searchFields = fields ?? Object.keys(rec);
          return searchFields.some((f) => {
            const val = rec[f];
            if (val === null || val === undefined) return false;
            return String(val).toLowerCase().includes(query);
          });
        });
      }

      case 'includes': {
        const value = resolve(expr.value);
        return source.includes(value);
      }

      case 'sort': {
        if (!field) return source;
        const direction = (expr.direction as string) === 'desc' ? -1 : 1;
        return [...source].sort((a, b) => {
          const aVal = (a as Record<string, unknown>)[field];
          const bVal = (b as Record<string, unknown>)[field];
          if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal) * direction;
          return ((aVal as number) - (bVal as number)) * direction;
        });
      }

      case 'first':
        return source.length > 0 ? source[0] : undefined;

      case 'last':
        return source.length > 0 ? source[source.length - 1] : undefined;

      case 'slice': {
        const from = Number(resolve(expr.from) ?? 0);
        const to = expr.to !== undefined ? Number(resolve(expr.to)) : undefined;
        return to !== undefined ? source.slice(from, to) : source.slice(from);
      }

      case 'length':
        return source.length;

      default:
        throw new Error(`Unknown $array operation: "${op}"`);
    }
  },
};
