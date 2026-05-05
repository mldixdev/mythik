import { describe, it, expect } from 'vitest';
import { condHandler } from '../../src/expressions/handlers/cond.js';
import { stateHandler } from '../../src/expressions/handlers/state.js';
import { createStateStore } from '../../src/state/store.js';
import type { ResolverContext } from '../../src/types.js';

describe('$cond handler', () => {
  function makeContext(state: Record<string, unknown>): ResolverContext {
    const store = createStateStore(state);
    return {
      getState: (path) => store.get(path),
      setState: (path, value) => store.set(path, value),
    };
  }

  function makeResolve(ctx: ResolverContext) {
    return function resolve(expr: unknown): unknown {
      if (expr === null || expr === undefined || typeof expr !== 'object' || Array.isArray(expr)) return expr;
      const obj = expr as Record<string, unknown>;
      if ('$cond' in obj) return condHandler.resolve(obj, ctx, resolve);
      if ('$state' in obj) return stateHandler.resolve(obj, ctx);
      return expr;
    };
  }

  const ctx = makeContext({ user: { role: 'admin', age: 25 }, form: { isValid: true, count: 5 } });
  const resolve = makeResolve(ctx);

  it('returns $then when condition is truthy', () => {
    expect(condHandler.resolve(
      { $cond: { $state: '/form/isValid' }, $then: 'yes', $else: 'no' },
      ctx, resolve,
    )).toBe('yes');
  });

  it('returns $else when condition is falsy', () => {
    const ctx2 = makeContext({ form: { isValid: false } });
    expect(condHandler.resolve(
      { $cond: { $state: '/form/isValid' }, $then: 'yes', $else: 'no' },
      ctx2, makeResolve(ctx2),
    )).toBe('no');
  });

  it('evaluates eq comparison', () => {
    expect(condHandler.resolve(
      { $cond: { $state: '/user/role', eq: 'admin' }, $then: 'admin', $else: 'other' },
      ctx, resolve,
    )).toBe('admin');
  });

  it('evaluates neq comparison', () => {
    expect(condHandler.resolve(
      { $cond: { $state: '/user/role', neq: 'admin' }, $then: 'not-admin', $else: 'is-admin' },
      ctx, resolve,
    )).toBe('is-admin');
  });

  it('evaluates gt comparison', () => {
    expect(condHandler.resolve(
      { $cond: { $state: '/user/age', gt: 18 }, $then: 'adult', $else: 'minor' },
      ctx, resolve,
    )).toBe('adult');
  });

  it('evaluates lt comparison', () => {
    expect(condHandler.resolve(
      { $cond: { $state: '/form/count', lt: 10 }, $then: 'low', $else: 'high' },
      ctx, resolve,
    )).toBe('low');
  });

  it('evaluates gte comparison', () => {
    expect(condHandler.resolve(
      { $cond: { $state: '/form/count', gte: 5 }, $then: 'enough', $else: 'not enough' },
      ctx, resolve,
    )).toBe('enough');
  });

  it('evaluates lte comparison', () => {
    expect(condHandler.resolve(
      { $cond: { $state: '/form/count', lte: 5 }, $then: 'ok', $else: 'over' },
      ctx, resolve,
    )).toBe('ok');
  });

  it('evaluates not modifier', () => {
    expect(condHandler.resolve(
      { $cond: { $state: '/form/isValid', not: true }, $then: 'invalid', $else: 'valid' },
      ctx, resolve,
    )).toBe('valid');
  });

  it('resolves nested expressions inside the selected object branch', () => {
    expect(condHandler.resolve(
      {
        $cond: { $state: '/form/isValid' },
        $then: {
          kind: 'selected',
          user: { $state: '/user/role' },
          metrics: [{ count: { $state: '/form/count' } }],
        },
        $else: {
          kind: 'fallback',
          user: { $state: '/missing' },
        },
      },
      ctx,
      resolve,
    )).toEqual({
      kind: 'selected',
      user: 'admin',
      metrics: [{ count: 5 }],
    });
  });

  it('has the correct key', () => {
    expect(condHandler.key).toBe('$cond');
  });
});
