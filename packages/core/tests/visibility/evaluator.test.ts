import { describe, it, expect } from 'vitest';
import { evaluateVisibility } from '../../src/visibility/evaluator.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('evaluateVisibility', () => {
  const store = createStateStore({
    user: { role: 'admin', age: 25, active: true },
    form: { isValid: true, count: 5 },
    cart: { total: 250 },
  });
  const resolver = createResolver({ store });
  const resolve = (expr: unknown) => resolver.resolve(expr);

  it('returns true for undefined', () => {
    expect(evaluateVisibility(undefined, resolve)).toBe(true);
  });

  it('returns boolean as-is', () => {
    expect(evaluateVisibility(true, resolve)).toBe(true);
    expect(evaluateVisibility(false, resolve)).toBe(false);
  });

  it('evaluates single $state condition (truthy)', () => {
    expect(evaluateVisibility({ $state: '/user/active' }, resolve)).toBe(true);
  });

  it('evaluates single $state with eq', () => {
    expect(evaluateVisibility({ $state: '/user/role', eq: 'admin' }, resolve)).toBe(true);
    expect(evaluateVisibility({ $state: '/user/role', eq: 'viewer' }, resolve)).toBe(false);
  });

  it('evaluates gt/lt comparisons', () => {
    expect(evaluateVisibility({ $state: '/user/age', gt: 18 }, resolve)).toBe(true);
    expect(evaluateVisibility({ $state: '/user/age', lt: 18 }, resolve)).toBe(false);
  });

  it('evaluates not modifier', () => {
    expect(evaluateVisibility({ $state: '/user/active', not: true }, resolve)).toBe(false);
  });

  it('evaluates array as implicit AND', () => {
    expect(evaluateVisibility([
      { $state: '/user/role', eq: 'admin' },
      { $state: '/form/isValid' },
    ], resolve)).toBe(true);

    expect(evaluateVisibility([
      { $state: '/user/role', eq: 'admin' },
      { $state: '/user/role', eq: 'viewer' },
    ], resolve)).toBe(false);
  });

  it('evaluates $or', () => {
    expect(evaluateVisibility({
      $or: [
        { $state: '/user/role', eq: 'superadmin' },
        { $state: '/cart/total', gt: 200 },
      ],
    }, resolve)).toBe(true);

    expect(evaluateVisibility({
      $or: [
        { $state: '/user/role', eq: 'superadmin' },
        { $state: '/cart/total', gt: 500 },
      ],
    }, resolve)).toBe(false);
  });

  it('evaluates $and', () => {
    expect(evaluateVisibility({
      $and: [
        { $state: '/user/role', eq: 'admin' },
        { $state: '/user/active' },
      ],
    }, resolve)).toBe(true);
  });

  it('evaluates nested $or with $and', () => {
    expect(evaluateVisibility({
      $or: [
        { $and: [
          { $state: '/user/role', eq: 'admin' },
          { $state: '/cart/total', gt: 100 },
        ]},
        { $state: '/user/role', eq: 'superadmin' },
      ],
    }, resolve)).toBe(true);
  });

  it('evaluates gte/lte', () => {
    expect(evaluateVisibility({ $state: '/form/count', gte: 5 }, resolve)).toBe(true);
    expect(evaluateVisibility({ $state: '/form/count', lte: 5 }, resolve)).toBe(true);
    expect(evaluateVisibility({ $state: '/form/count', gte: 6 }, resolve)).toBe(false);
  });

  it('evaluates neq', () => {
    expect(evaluateVisibility({ $state: '/user/role', neq: 'viewer' }, resolve)).toBe(true);
    expect(evaluateVisibility({ $state: '/user/role', neq: 'admin' }, resolve)).toBe(false);
  });
});
