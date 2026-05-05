import { describe, it, expect } from 'vitest';
import { computedHandler } from '../../src/expressions/handlers/computed.js';
import { stateHandler } from '../../src/expressions/handlers/state.js';
import { createStateStore } from '../../src/state/store.js';
import type { ResolverContext } from '../../src/types.js';

describe('$computed handler', () => {
  const store = createStateStore({
    patient: { weight: 80, height: 1.75 },
  });

  const computedFunctions: Record<string, (...args: unknown[]) => unknown> = {
    calculateBMI: (args: Record<string, unknown>) => {
      const w = args.weight as number;
      const h = args.height as number;
      return Math.round((w / (h * h)) * 10) / 10;
    },
    fullName: (args: Record<string, unknown>) => `${args.first} ${args.last}`.trim(),
    noArgs: () => 42,
  };

  const context: ResolverContext = {
    getState: (path) => store.get(path),
    setState: (path, value) => store.set(path, value),
    computedFunctions,
  };

  function resolve(expr: unknown): unknown {
    if (expr === null || expr === undefined || typeof expr !== 'object' || Array.isArray(expr)) return expr;
    const obj = expr as Record<string, unknown>;
    if ('$state' in obj) return stateHandler.resolve(obj, context);
    if ('$computed' in obj) return computedHandler.resolve(obj, context, resolve);
    return expr;
  }

  it('calls a computed function with resolved args', () => {
    expect(computedHandler.resolve(
      { $computed: 'calculateBMI', args: { weight: { $state: '/patient/weight' }, height: { $state: '/patient/height' } } },
      context, resolve,
    )).toBe(26.1);
  });

  it('calls a computed function with literal args', () => {
    expect(computedHandler.resolve(
      { $computed: 'fullName', args: { first: 'Bob', last: 'Jones' } },
      context, resolve,
    )).toBe('Bob Jones');
  });

  it('calls a computed function with no args', () => {
    expect(computedHandler.resolve({ $computed: 'noArgs' }, context, resolve)).toBe(42);
  });

  it('throws for unregistered function', () => {
    expect(() => computedHandler.resolve({ $computed: 'unknownFn' }, context, resolve))
      .toThrow('Computed function "unknownFn" is not registered');
  });

  it('has the correct key', () => {
    expect(computedHandler.key).toBe('$computed');
  });
});
