import { describe, it, expect } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('$math handler', () => {
  const store = createStateStore({ a: 10, b: 3, price: 29.99 });
  const resolver = createResolver({ store });

  it('adds numbers', () => {
    expect(resolver.resolve({ $math: 'add', args: [{ $state: '/a' }, { $state: '/b' }] })).toBe(13);
  });

  it('adds multiple numbers', () => {
    expect(resolver.resolve({ $math: 'add', args: [1, 2, 3, 4] })).toBe(10);
  });

  it('subtracts', () => {
    expect(resolver.resolve({ $math: 'subtract', args: [{ $state: '/a' }, { $state: '/b' }] })).toBe(7);
  });

  it('multiplies', () => {
    expect(resolver.resolve({ $math: 'multiply', args: [{ $state: '/a' }, { $state: '/b' }] })).toBe(30);
  });

  it('divides', () => {
    expect(resolver.resolve({ $math: 'divide', args: [{ $state: '/a' }, { $state: '/b' }] })).toBeCloseTo(3.33, 1);
  });

  it('divides by zero returns 0', () => {
    expect(resolver.resolve({ $math: 'divide', args: [10, 0] })).toBe(0);
  });

  it('rounds with decimals', () => {
    expect(resolver.resolve({ $math: 'round', value: { $state: '/price' }, decimals: 1 })).toBe(30.0);
  });

  it('floor', () => {
    expect(resolver.resolve({ $math: 'floor', value: 3.7 })).toBe(3);
  });

  it('ceil', () => {
    expect(resolver.resolve({ $math: 'ceil', value: 3.2 })).toBe(4);
  });

  it('abs', () => {
    expect(resolver.resolve({ $math: 'abs', value: -5 })).toBe(5);
  });

  it('min/max', () => {
    expect(resolver.resolve({ $math: 'min', args: [5, 2, 8, 1] })).toBe(1);
    expect(resolver.resolve({ $math: 'max', args: [5, 2, 8, 1] })).toBe(8);
  });

  it('mod', () => {
    expect(resolver.resolve({ $math: 'mod', args: [10, 3] })).toBe(1);
  });

  it('treats undefined state as 0 instead of NaN', () => {
    expect(resolver.resolve({ $math: 'add', args: [{ $state: '/nonexistent' }, 1] })).toBe(1);
  });

  it('treats null as 0 instead of NaN', () => {
    expect(resolver.resolve({ $math: 'multiply', args: [null, 5] })).toBe(0);
  });

  it('subtract with undefined produces 0 not NaN', () => {
    expect(resolver.resolve({ $math: 'subtract', args: [{ $state: '/nonexistent' }, 3] })).toBe(-3);
  });
});
