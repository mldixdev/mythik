import { describe, it, expect } from 'vitest';
import { bindStateHandler, bindItemHandler, itemHandler, indexHandler } from '../../src/expressions/handlers/bind.js';
import { createStateStore } from '../../src/state/store.js';
import type { ResolverContext } from '../../src/types.js';

describe('$bindState handler', () => {
  it('returns current value at the bound path', () => {
    const store = createStateStore({ form: { email: 'test@test.com' } });
    const ctx: ResolverContext = { getState: (p) => store.get(p), setState: (p, v) => store.set(p, v) };
    expect(bindStateHandler.resolve({ $bindState: '/form/email' }, ctx)).toBe('test@test.com');
  });

  it('returns undefined for empty path', () => {
    const store = createStateStore({ form: { email: '' } });
    const ctx: ResolverContext = { getState: (p) => store.get(p), setState: (p, v) => store.set(p, v) };
    expect(bindStateHandler.resolve({ $bindState: '/form/email' }, ctx)).toBe('');
  });

  it('has the correct key', () => {
    expect(bindStateHandler.key).toBe('$bindState');
  });
});

describe('$bindItem handler', () => {
  const ctx: ResolverContext = {
    getState: () => undefined,
    setState: () => {},
    item: { id: 1, title: 'Task A', completed: false },
    index: 0,
  };

  it('returns a field from the current item', () => {
    expect(bindItemHandler.resolve({ $bindItem: 'title' }, ctx)).toBe('Task A');
  });

  it('returns entire item with empty string', () => {
    expect(bindItemHandler.resolve({ $bindItem: '' }, ctx)).toEqual({ id: 1, title: 'Task A', completed: false });
  });

  it('throws outside repeat context', () => {
    const noItemCtx: ResolverContext = { getState: () => undefined, setState: () => {} };
    expect(() => bindItemHandler.resolve({ $bindItem: 'title' }, noItemCtx)).toThrow('outside of a repeat');
  });
});

describe('$item handler', () => {
  const ctx: ResolverContext = {
    getState: () => undefined,
    setState: () => {},
    item: { name: 'Alice', age: 30 },
    index: 2,
  };

  it('reads a field from the item', () => {
    expect(itemHandler.resolve({ $item: 'name' }, ctx)).toBe('Alice');
  });

  it('returns full item with empty string', () => {
    expect(itemHandler.resolve({ $item: '' }, ctx)).toEqual({ name: 'Alice', age: 30 });
  });
});

describe('$index handler', () => {
  it('returns the current index', () => {
    const ctx: ResolverContext = { getState: () => undefined, setState: () => {}, index: 5 };
    expect(indexHandler.resolve({ $index: true }, ctx)).toBe(5);
  });

  it('throws outside repeat context', () => {
    const ctx: ResolverContext = { getState: () => undefined, setState: () => {} };
    expect(() => indexHandler.resolve({ $index: true }, ctx)).toThrow('outside of a repeat');
  });
});
