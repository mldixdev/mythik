import { describe, it, expect } from 'vitest';
import { parseLazyPath, isOnLazyPath, getParsedLazyPaths } from '../../src/renderer/lazy-paths.js';

describe('parseLazyPath', () => {
  it('parses single segment without brackets', () => {
    expect(parseLazyPath('foo')).toEqual(['foo']);
  });

  it('parses single segment with one bracket pair', () => {
    expect(parseLazyPath('columns[]')).toEqual(['columns', '[]']);
  });

  it('parses multi-segment with bracket pairs (audit canonical case)', () => {
    expect(parseLazyPath('columns[].actions[].onPress')).toEqual([
      'columns', '[]', 'actions', '[]', 'onPress',
    ]);
  });

  it('parses consecutive bracket pairs on one segment', () => {
    expect(parseLazyPath('a[][]')).toEqual(['a', '[]', '[]']);
  });

  it('returns empty array for empty input', () => {
    expect(parseLazyPath('')).toEqual([]);
  });
});

describe('isOnLazyPath', () => {
  const lazyOne = parseLazyPath('columns[].actions[].onPress');

  it('returns true when current path matches with numeric in [] slot', () => {
    expect(isOnLazyPath(['columns', 0, 'actions', 1, 'onPress'], [lazyOne])).toBe(true);
  });

  it('returns true with high numeric indices', () => {
    expect(isOnLazyPath(['columns', 99, 'actions', 12, 'onPress'], [lazyOne])).toBe(true);
  });

  it('returns false on length mismatch (shorter)', () => {
    expect(isOnLazyPath(['columns', 0, 'actions'], [lazyOne])).toBe(false);
  });

  it('returns false on length mismatch (longer)', () => {
    expect(isOnLazyPath(['columns', 0, 'actions', 1, 'onPress', 'extra'], [lazyOne])).toBe(false);
  });

  it('returns false when string appears in [] slot', () => {
    expect(isOnLazyPath(['columns', 'badIdx', 'actions', 1, 'onPress'], [lazyOne])).toBe(false);
  });

  it('returns false when literal segment differs', () => {
    expect(isOnLazyPath(['columns', 0, 'rows', 1, 'onPress'], [lazyOne])).toBe(false);
  });

  it('returns true when matching one of multiple lazy paths', () => {
    const lazyTwo = parseLazyPath('items[].handler');
    expect(isOnLazyPath(['items', 3, 'handler'], [lazyOne, lazyTwo])).toBe(true);
  });

  it('returns false (zero-cost guard) when lazyPaths is empty', () => {
    expect(isOnLazyPath(['anything', 0, 'whatever'], [])).toBe(false);
  });
});

describe('getParsedLazyPaths', () => {
  it('returns shared empty array reference when raw is undefined', () => {
    const a = getParsedLazyPaths('foo', undefined);
    const b = getParsedLazyPaths('bar', undefined);
    expect(a).toBe(b);
    expect(a).toEqual([]);
  });

  it('returns shared empty array reference when raw is empty', () => {
    const a = getParsedLazyPaths('foo', []);
    const b = getParsedLazyPaths('bar', []);
    expect(a).toBe(b);
  });

  it('memoizes parsed result per primitive type', () => {
    const a = getParsedLazyPaths('uniq-prim-1', ['x[].y']);
    const b = getParsedLazyPaths('uniq-prim-1', ['x[].y']);
    expect(a).toBe(b);
  });

  it('returns parsed segments matching parseLazyPath output', () => {
    const result = getParsedLazyPaths('uniq-prim-2', ['columns[].actions[].onPress']);
    expect(result).toEqual([['columns', '[]', 'actions', '[]', 'onPress']]);
  });
});
