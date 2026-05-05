import { describe, expect, it } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('$uniqueId handler', () => {
  it('returns the first deterministic unused prefixed id', () => {
    const store = createStateStore({
      items: [
        { id: 'item-01' },
        { id: 'item-02' },
        { id: 'item-04' },
      ],
    });
    const resolver = createResolver({ store });

    expect(resolver.resolve({
      $uniqueId: true,
      source: { $state: '/items' },
      field: 'id',
      prefix: 'item-',
      padding: 2,
    })).toBe('item-03');
  });

  it('treats numeric and string ids as collisions and supports expression config', () => {
    const store = createStateStore({
      config: { prefix: '', start: 7 },
      items: [
        { id: 7 },
        { id: '8' },
        { id: 9 },
      ],
    });
    const resolver = createResolver({ store });

    expect(resolver.resolve({
      $uniqueId: true,
      source: { $state: '/items' },
      field: 'id',
      prefix: { $state: '/config/prefix' },
      start: { $state: '/config/start' },
    })).toBe('10');
  });
});
