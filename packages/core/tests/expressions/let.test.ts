import { describe, it, expect } from 'vitest';
import { letHandler, refHandler } from '../../src/expressions/handlers/let.js';
import { stateHandler } from '../../src/expressions/handlers/state.js';
import { computedHandler } from '../../src/expressions/handlers/computed.js';
import { createStateStore } from '../../src/state/store.js';
import type { ResolverContext } from '../../src/types.js';

describe('$let/$ref handlers', () => {
  const store = createStateStore({
    patient: { weight: 80, height: 1.75 },
  });

  const computedFunctions: Record<string, (...args: unknown[]) => unknown> = {
    calculateBMI: (args: Record<string, unknown>) => {
      const w = args.weight as number;
      const h = args.height as number;
      return Math.round((w / (h * h)) * 10) / 10;
    },
  };

  const context: ResolverContext = {
    getState: (path) => store.get(path),
    setState: (path, value) => store.set(path, value),
    computedFunctions,
    letBindings: {},
  };

  function resolve(expr: unknown, ctx?: ResolverContext): unknown {
    const c = ctx ?? context;
    if (expr === null || expr === undefined || typeof expr !== 'object' || Array.isArray(expr)) return expr;
    const obj = expr as Record<string, unknown>;
    if ('$state' in obj) return stateHandler.resolve(obj, c);
    if ('$computed' in obj) return computedHandler.resolve(obj, c, (e) => resolve(e, c));
    if ('$let' in obj) return letHandler.resolve(obj, c, (e, ctx2) => resolve(e, ctx2 ?? c));
    if ('$ref' in obj) return refHandler.resolve(obj, c);
    return expr;
  }

  it('defines a binding and resolves $ref to it', () => {
    expect(resolve({
      $let: { bmi: { $computed: 'calculateBMI', args: { weight: { $state: '/patient/weight' }, height: { $state: '/patient/height' } } } },
      $in: { $ref: 'bmi' },
    })).toBe(26.1);
  });

  it('supports multiple bindings', () => {
    expect(resolve({
      $let: { w: { $state: '/patient/weight' }, h: { $state: '/patient/height' } },
      $in: { $computed: 'calculateBMI', args: { weight: { $ref: 'w' }, height: { $ref: 'h' } } },
    })).toBe(26.1);
  });

  it('$ref throws for undefined binding', () => {
    expect(() => resolve({ $ref: 'nonexistent' })).toThrow('$ref "nonexistent" is not defined in any $let scope');
  });

  it('$let has the correct key', () => {
    expect(letHandler.key).toBe('$let');
  });

  it('$ref has the correct key', () => {
    expect(refHandler.key).toBe('$ref');
  });
});
