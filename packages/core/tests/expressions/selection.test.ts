import { describe, it, expect } from 'vitest';
import { createResolver } from '../../src/expressions/resolver.js';
import { createStateStore } from '../../src/state/store.js';

describe('$selection expression', () => {
  it('"selected" returns true when item ID is in selection array', () => {
    const store = createStateStore({ selectedIds: [1, 3] });
    const resolver = createResolver({ store });
    const result = resolver.resolve(
      { $selection: 'selected' },
      { item: { id: 1, name: 'Alice' }, index: 0, selection: { state: '/selectedIds', key: 'id', mode: 'multiple' } },
    );
    expect(result).toBe(true);
  });

  it('"selected" returns false when item ID is not in selection array', () => {
    const store = createStateStore({ selectedIds: [1, 3] });
    const resolver = createResolver({ store });
    const result = resolver.resolve(
      { $selection: 'selected' },
      { item: { id: 2, name: 'Bob' }, index: 1, selection: { state: '/selectedIds', key: 'id', mode: 'multiple' } },
    );
    expect(result).toBe(false);
  });

  it('"count" returns number of selected items', () => {
    const store = createStateStore({ selectedIds: [1, 3, 5] });
    const resolver = createResolver({ store });
    const result = resolver.resolve(
      { $selection: 'count' },
      { item: { id: 1 }, index: 0, selection: { state: '/selectedIds', key: 'id', mode: 'multiple' } },
    );
    expect(result).toBe(3);
  });

  it('throws on unknown operation', () => {
    const store = createStateStore({ sel: [] });
    const resolver = createResolver({ store });
    expect(() =>
      resolver.resolve(
        { $selection: 'bogus' },
        { item: { id: 1 }, index: 0, selection: { state: '/sel', key: 'id', mode: 'multiple' } },
      ),
    ).toThrow('Unknown $selection operation: "bogus"');
  });

  it('throws when used without selection context', () => {
    const store = createStateStore({});
    const resolver = createResolver({ store });
    expect(() =>
      resolver.resolve({ $selection: 'selected' }, { item: { id: 1 }, index: 0 }),
    ).toThrow('$selection used outside of a repeat with selection');
  });
});
