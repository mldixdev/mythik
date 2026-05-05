import { describe, it, expect } from 'vitest';
import { stateHandler } from '../../src/expressions/handlers/state.js';
import { createStateStore } from '../../src/state/store.js';
import type { ResolverContext } from '../../src/types.js';

describe('$state handler', () => {
  const store = createStateStore({
    user: { name: 'Alice', age: 30 },
    items: [{ id: 1, title: 'Task A' }],
  });

  const context: ResolverContext = {
    getState: (path) => store.get(path),
    setState: (path, value) => store.set(path, value),
  };

  it('resolves a simple state path', () => {
    expect(stateHandler.resolve({ $state: '/user/name' }, context)).toBe('Alice');
  });

  it('resolves a nested state path', () => {
    expect(stateHandler.resolve({ $state: '/items/0/title' }, context)).toBe('Task A');
  });

  it('returns undefined for missing path', () => {
    expect(stateHandler.resolve({ $state: '/user/missing' }, context)).toBeUndefined();
  });

  it('resolves object at path', () => {
    expect(stateHandler.resolve({ $state: '/user' }, context)).toEqual({ name: 'Alice', age: 30 });
  });

  it('has the correct key', () => {
    expect(stateHandler.key).toBe('$state');
  });
});
