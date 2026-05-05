import { describe, it, expect } from 'vitest';
import { evaluateVisibility } from '../../src/visibility/evaluator.js';

describe('evaluateVisibility works with a resolve closure carrying props context', () => {
  it('resolves { $prop: name } inside a visible expression when the closure has props', () => {
    const propsContext = { show: true };
    const resolve = (expr: unknown): unknown => {
      if (expr === null || expr === undefined) return expr;
      if (typeof expr !== 'object') return expr;
      const obj = expr as Record<string, unknown>;
      if ('$prop' in obj) {
        const name = obj.$prop as string;
        return propsContext[name as keyof typeof propsContext];
      }
      return expr;
    };

    expect(evaluateVisibility({ $prop: 'show' }, resolve)).toBe(true);
    expect(evaluateVisibility({ $prop: 'missing' }, resolve)).toBe(false);
  });

  it('resolves $prop inside $and/$or compositions', () => {
    const props = { a: true, b: false };
    const resolve = (expr: unknown): unknown => {
      if (expr === null || expr === undefined) return expr;
      if (typeof expr !== 'object') return expr;
      const obj = expr as Record<string, unknown>;
      if ('$prop' in obj) return props[obj.$prop as keyof typeof props];
      return expr;
    };

    expect(evaluateVisibility({ $and: [{ $prop: 'a' }, { $prop: 'b' }] }, resolve)).toBe(false);
    expect(evaluateVisibility({ $or: [{ $prop: 'a' }, { $prop: 'b' }] }, resolve)).toBe(true);
  });
});
