import { describe, it, expect } from 'vitest';
import { topologicalSort } from '../../src/derive/topo-sort.js';

describe('topologicalSort', () => {
  it('orders independent paths in any order', () => {
    const derive = { a: 1, b: 2, c: 3 };
    const depsMap = new Map<string, Set<string>>([
      ['a', new Set()],
      ['b', new Set()],
      ['c', new Set()],
    ]);
    const sorted = topologicalSort(derive, depsMap);
    expect(sorted).toHaveLength(3);
    expect(new Set(sorted)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('orders dependent paths so dependencies come first', () => {
    const derive = { a: 1, b: 2, c: 3 };
    const depsMap = new Map<string, Set<string>>([
      ['a', new Set(['b'])],
      ['b', new Set(['c'])],
      ['c', new Set()],
    ]);
    const sorted = topologicalSort(derive, depsMap);
    expect(sorted.indexOf('c')).toBeLessThan(sorted.indexOf('b'));
    expect(sorted.indexOf('b')).toBeLessThan(sorted.indexOf('a'));
  });

  it('throws on circular dependency', () => {
    const derive = { a: 1, b: 2 };
    const depsMap = new Map<string, Set<string>>([
      ['a', new Set(['b'])],
      ['b', new Set(['a'])],
    ]);
    expect(() => topologicalSort(derive, depsMap)).toThrow(/Circular dependency/);
  });
});
