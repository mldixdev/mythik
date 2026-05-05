import { describe, it, expect } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('$array handler', () => {
  const store = createStateStore({
    products: [
      { id: 1, name: 'Laptop', category: 'electronics', price: 999, stock: 5 },
      { id: 2, name: 'Shirt', category: 'clothing', price: 29, stock: 50 },
      { id: 3, name: 'Coffee', category: 'food', price: 15, stock: 3 },
      { id: 4, name: 'Phone', category: 'electronics', price: 699, stock: 12 },
    ],
    tags: ['urgent', 'review', 'shipped'],
  });
  const resolver = createResolver({ store });

  it('counts all items', () => {
    expect(resolver.resolve({ $array: 'count', source: { $state: '/products' } })).toBe(4);
  });

  it('counts with condition', () => {
    expect(resolver.resolve({
      $array: 'count', source: { $state: '/products' }, where: { field: 'category', eq: 'electronics' },
    })).toBe(2);
  });

  it('counts with lt condition', () => {
    expect(resolver.resolve({
      $array: 'count', source: { $state: '/products' }, where: { field: 'stock', lt: 10 },
    })).toBe(2);
  });

  it('sums a field', () => {
    expect(resolver.resolve({ $array: 'sum', source: { $state: '/products' }, field: 'price' })).toBe(1742);
  });

  it('sumProduct of two fields', () => {
    expect(resolver.resolve({
      $array: 'sumProduct', source: { $state: '/products' }, field1: 'price', field2: 'stock',
    })).toBe(999 * 5 + 29 * 50 + 15 * 3 + 699 * 12);
  });

  it('filters items', () => {
    const result = resolver.resolve({
      $array: 'filter', source: { $state: '/products' }, where: { field: 'category', eq: 'food' },
    }) as unknown[];
    expect(result).toHaveLength(1);
    expect((result[0] as Record<string, unknown>).name).toBe('Coffee');
  });

  it('removes items', () => {
    const result = resolver.resolve({
      $array: 'remove', source: { $state: '/products' }, where: { field: 'id', eq: 2 },
    }) as unknown[];
    expect(result).toHaveLength(3);
    expect(result.find((p) => (p as Record<string, unknown>).id === 2)).toBeUndefined();
  });

  it('appends item', () => {
    const result = resolver.resolve({
      $array: 'append', source: { $state: '/products' }, value: { id: 5, name: 'New' },
    }) as unknown[];
    expect(result).toHaveLength(5);
    expect((result[4] as Record<string, unknown>).name).toBe('New');
  });

  it('deep resolves nested expression values when appending objects', () => {
    const localStore = createStateStore({
      items: [{ id: 'item-1' }],
      draft: { id: 'item-2', x: '120', y: '90', capacity: '4' },
    });
    const localResolver = createResolver({ store: localStore });

    const result = localResolver.resolve({
      $array: 'append',
      source: { $state: '/items' },
      value: {
        id: { $state: '/draft/id' },
        position: {
          x: { $math: 'add', args: [{ $state: '/draft/x' }, 0] },
          y: { $math: 'add', args: [{ $state: '/draft/y' }, 0] },
        },
        metadata: {
          capacity: { $math: 'add', args: [{ $state: '/draft/capacity' }, 0] },
        },
      },
    }) as Array<Record<string, unknown>>;

    expect(result[1]).toEqual({
      id: 'item-2',
      position: { x: 120, y: 90 },
      metadata: { capacity: 4 },
    });
  });

  it('deep resolves nested expression values when replacing objects', () => {
    const localStore = createStateStore({
      items: [{ id: 'item-1', position: { x: 10, y: 20 }, metadata: { capacity: 2 } }],
      draft: { id: 'item-1', x: '140', y: '95', capacity: '6' },
    });
    const localResolver = createResolver({ store: localStore });

    const result = localResolver.resolve({
      $array: 'replace',
      source: { $state: '/items' },
      where: { field: 'id', eq: 'item-1' },
      value: {
        position: {
          x: { $math: 'add', args: [{ $state: '/draft/x' }, 0] },
          y: { $math: 'add', args: [{ $state: '/draft/y' }, 0] },
        },
        metadata: {
          capacity: { $math: 'add', args: [{ $state: '/draft/capacity' }, 0] },
        },
      },
    }) as Array<Record<string, unknown>>;

    expect(result[0]).toMatchObject({
      id: 'item-1',
      position: { x: 140, y: 95 },
      metadata: { capacity: 6 },
    });
  });

  it('maps a field', () => {
    const result = resolver.resolve({
      $array: 'map', source: { $state: '/products' }, field: 'name',
    }) as string[];
    expect(result).toEqual(['Laptop', 'Shirt', 'Coffee', 'Phone']);
  });

  it('finds item', () => {
    const result = resolver.resolve({
      $array: 'find', source: { $state: '/products' }, where: { field: 'id', eq: 3 },
    }) as Record<string, unknown>;
    expect(result.name).toBe('Coffee');
  });

  it('checks includes', () => {
    expect(resolver.resolve({ $array: 'includes', source: { $state: '/tags' }, value: 'urgent' })).toBe(true);
    expect(resolver.resolve({ $array: 'includes', source: { $state: '/tags' }, value: 'missing' })).toBe(false);
  });

  it('sorts ascending', () => {
    const result = resolver.resolve({
      $array: 'sort', source: { $state: '/products' }, field: 'price', direction: 'asc',
    }) as Array<Record<string, unknown>>;
    expect(result[0].name).toBe('Coffee');
    expect(result[3].name).toBe('Laptop');
  });

  it('sorts descending', () => {
    const result = resolver.resolve({
      $array: 'sort', source: { $state: '/products' }, field: 'price', direction: 'desc',
    }) as Array<Record<string, unknown>>;
    expect(result[0].name).toBe('Laptop');
  });

  it('first/last', () => {
    expect((resolver.resolve({ $array: 'first', source: { $state: '/products' } }) as Record<string, unknown>).name).toBe('Laptop');
    expect((resolver.resolve({ $array: 'last', source: { $state: '/products' } }) as Record<string, unknown>).name).toBe('Phone');
  });

  it('returns 0 for count on non-array', () => {
    expect(resolver.resolve({ $array: 'count', source: 'not an array' })).toBe(0);
  });
});
