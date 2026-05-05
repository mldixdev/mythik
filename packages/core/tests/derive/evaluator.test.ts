import { describe, it, expect, vi } from 'vitest';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createDeriveEngine } from '../../src/derive/evaluator.js';

function setup(initialState: Record<string, unknown>, derive: Record<string, unknown>) {
  const store = createStateStore(initialState);
  const resolver = createResolver({ store });
  const engine = createDeriveEngine({ store, resolver, derive });
  return { store, resolver, engine };
}

describe('derive evaluator', () => {
  it('evaluates all derive expressions on mount', () => {
    const { store, engine } = setup(
      { items: [{ price: 10 }, { price: 20 }, { price: 30 }] },
      {
        '/stats/total': { $array: 'sum', source: { $state: '/items' }, field: 'price' },
        '/stats/count': { $array: 'count', source: { $state: '/items' } },
      },
    );
    engine.mount();
    expect(store.get('/stats/total')).toBe(60);
    expect(store.get('/stats/count')).toBe(3);
  });

  it('re-evaluates when dependency changes', () => {
    const { store, engine } = setup(
      { items: [{ price: 10 }, { price: 20 }] },
      {
        '/stats/total': { $array: 'sum', source: { $state: '/items' }, field: 'price' },
      },
    );
    engine.mount();
    expect(store.get('/stats/total')).toBe(30);

    store.set('/items', [{ price: 10 }, { price: 20 }, { price: 50 }]);
    engine.onStateChange('/items');
    expect(store.get('/stats/total')).toBe(80);
  });

  it('does NOT re-evaluate when unrelated state changes', () => {
    const { store, engine } = setup(
      { items: [{ price: 10 }], ui: { page: 0 } },
      {
        '/stats/total': { $array: 'sum', source: { $state: '/items' }, field: 'price' },
      },
    );
    engine.mount();
    const initialTotal = store.get('/stats/total');

    store.set('/ui/page', 1);
    engine.onStateChange('/ui/page');

    expect(store.get('/stats/total')).toBe(initialTotal);
  });

  it('evaluates derives in topological order', () => {
    const { store, engine } = setup(
      { items: [{ price: 10 }, { price: 20 }] },
      {
        '/stats/total': { $array: 'sum', source: { $state: '/items' }, field: 'price' },
        '/stats/doubled': { $math: 'multiply', args: [{ $state: '/stats/total' }, 2] },
      },
    );
    engine.mount();
    expect(store.get('/stats/total')).toBe(30);
    expect(store.get('/stats/doubled')).toBe(60);
  });

  it('detects circular dependencies', () => {
    const { engine } = setup(
      {},
      {
        '/a': { $math: 'add', args: [{ $state: '/b' }, 1] },
        '/b': { $math: 'add', args: [{ $state: '/a' }, 1] },
      },
    );
    expect(() => engine.mount()).toThrow(/circular/i);
  });

  it('returns derive paths for state guard protection', () => {
    const { engine } = setup(
      { items: [] },
      {
        '/stats/total': { $array: 'sum', source: { $state: '/items' }, field: 'price' },
        '/stats/count': { $array: 'count', source: { $state: '/items' } },
      },
    );
    expect(engine.getProtectedPaths()).toEqual(['/stats/total', '/stats/count']);
  });

  it('handles derive with $math and $array combined', () => {
    const { store, engine } = setup(
      { tasks: [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' },
        { status: 'pending' },
        { status: 'pending' },
      ]},
      {
        '/stats/completionRate': {
          $math: 'multiply',
          args: [
            {
              $math: 'divide',
              args: [
                { $array: 'count', source: { $state: '/tasks' }, where: { field: 'status', eq: 'completed' } },
                { $array: 'count', source: { $state: '/tasks' } },
              ],
            },
            100,
          ],
        },
      },
    );
    engine.mount();
    expect(store.get('/stats/completionRate')).toBe(40);
  });

  it('unmount stops listening', () => {
    const { store, engine } = setup(
      { items: [{ price: 10 }] },
      {
        '/stats/total': { $array: 'sum', source: { $state: '/items' }, field: 'price' },
      },
    );
    engine.mount();
    expect(store.get('/stats/total')).toBe(10);

    engine.unmount();
    store.set('/items', [{ price: 99 }]);
    // After unmount, derive should NOT re-evaluate
    expect(store.get('/stats/total')).toBe(10);
  });
});

describe('DeriveEngine — v49 Item E: error degradation', () => {
  it('does not break other derives when one throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = createStateStore({ ok: 5 });
    const resolver = createResolver({
      store,
      extraExpressionHandlers: [{
        key: '$throwOnPurpose',
        resolve: () => { throw new Error('intentional test error'); },
      }],
    });

    const engine = createDeriveEngine({
      store,
      resolver,
      derive: {
        '/computed/good': { $state: '/ok' },
        '/computed/bad': { $throwOnPurpose: true },
        '/computed/alsoGood': 42,
      },
    });

    expect(() => engine.mount()).not.toThrow();

    expect(store.get('/computed/good')).toBe(5);
    expect(store.get('/computed/alsoGood')).toBe(42);
    expect(store.get('/computed/bad')).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('/computed/bad'));

    consoleSpy.mockRestore();
  });

  it('continues recompute on state change after a path errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = createStateStore({ input: 1 });
    const resolver = createResolver({
      store,
      extraExpressionHandlers: [{
        key: '$throwIfZero',
        resolve: (obj, ctx, resolveFn) => {
          const params = (obj as Record<string, unknown>).$throwIfZero;
          const val = resolveFn!(params);
          if (val === 0) throw new Error('div by zero analog');
          return (val as number) * 2;
        },
      }],
    });

    const engine = createDeriveEngine({
      store,
      resolver,
      derive: {
        '/computed/double': { $throwIfZero: { $state: '/input' } },
        '/computed/safe': { $state: '/input' },
      },
    });

    engine.mount();
    expect(store.get('/computed/double')).toBe(2);
    expect(store.get('/computed/safe')).toBe(1);

    store.set('/input', 0);
    engine.onStateChange('/input');
    expect(store.get('/computed/double')).toBe(2);  // unchanged (not overwritten)
    expect(store.get('/computed/safe')).toBe(0);
    expect(consoleSpy).toHaveBeenCalled();

    store.set('/input', 3);
    engine.onStateChange('/input');
    expect(store.get('/computed/double')).toBe(6);
    expect(store.get('/computed/safe')).toBe(3);

    consoleSpy.mockRestore();
  });
});
