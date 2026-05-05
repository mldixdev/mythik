import { describe, it, expect, vi } from 'vitest';
import { createWatcherEngine } from '../../src/watchers/engine.js';
import { createStateStore } from '../../src/state/store.js';
import type { ActionBinding } from '../../src/types.js';

describe('WatcherEngine', () => {
  it('fires actions when watched path changes', () => {
    const store = createStateStore({ form: { country: 'US', city: '' } });
    const dispatched: ActionBinding[] = [];

    const watcher = createWatcherEngine(
      store,
      {
        watch: {
          '/form/country': [
            { action: 'setState', params: { statePath: '/form/city', value: '' } },
          ],
        },
      },
      { dispatch: (binding) => { dispatched.push(binding); } },
      (expr) => expr,
    );

    const cleanup = watcher.start();

    store.set('/form/country', 'MX');
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].action).toBe('setState');

    cleanup();
  });

  it('does not fire when unrelated path changes', () => {
    const store = createStateStore({ form: { country: 'US', name: '' } });
    const dispatched: ActionBinding[] = [];

    const watcher = createWatcherEngine(
      store,
      { watch: { '/form/country': [{ action: 'loadCities' }] } },
      { dispatch: (binding) => { dispatched.push(binding); } },
      (expr) => expr,
    );

    const cleanup = watcher.start();
    store.set('/form/name', 'Alice');
    expect(dispatched).toHaveLength(0);
    cleanup();
  });

  it('fires multiple actions sequentially', () => {
    const store = createStateStore({ form: { country: 'US' } });
    const order: string[] = [];

    const watcher = createWatcherEngine(
      store,
      {
        watch: {
          '/form/country': [
            { action: 'first' },
            { action: 'second' },
            { action: 'third' },
          ],
        },
      },
      { dispatch: (binding) => { order.push(binding.action); } },
      (expr) => expr,
    );

    const cleanup = watcher.start();
    store.set('/form/country', 'MX');
    expect(order).toEqual(['first', 'second', 'third']);
    cleanup();
  });

  it('stops firing after cleanup', () => {
    const store = createStateStore({ value: 0 });
    let count = 0;

    const watcher = createWatcherEngine(
      store,
      { watch: { '/value': [{ action: 'count' }] } },
      { dispatch: () => { count++; } },
      (expr) => expr,
    );

    const cleanup = watcher.start();
    store.set('/value', 1);
    expect(count).toBe(1);

    cleanup();
    store.set('/value', 2);
    expect(count).toBe(1); // No more fires
  });

  it('watches multiple paths independently', () => {
    const store = createStateStore({ a: 0, b: 0 });
    const fired: string[] = [];

    const watcher = createWatcherEngine(
      store,
      {
        watch: {
          '/a': [{ action: 'onA' }],
          '/b': [{ action: 'onB' }],
        },
      },
      { dispatch: (binding) => { fired.push(binding.action); } },
      (expr) => expr,
    );

    const cleanup = watcher.start();
    store.set('/a', 1);
    store.set('/b', 1);
    expect(fired).toEqual(['onA', 'onB']);
    cleanup();
  });
});
