/**
 * Tests that middleware is actually wired into the dispatcher dispatch() function.
 * The middleware chain unit tests (middleware.test.ts) verify the chain itself.
 * These tests verify the INTEGRATION — that dispatch() calls before/after/onError.
 */
import { describe, it, expect, vi } from 'vitest';
import { createActionDispatcher } from '../../src/actions/dispatcher.js';
import { createStateStore } from '../../src/state/store.js';
import type { ActionMiddleware } from '../../src/actions/middleware.js';

function setup(middleware: ActionMiddleware[] = []) {
  const store = createStateStore({});
  const dispatcher = createActionDispatcher({ store, middleware });
  const resolve = (expr: unknown) => expr;
  return { store, dispatcher, resolve };
}

describe('Dispatcher Middleware Integration', () => {
  it('before middleware runs before action execution', async () => {
    const order: string[] = [];
    const { store, dispatcher, resolve } = setup([
      {
        name: 'tracker',
        before: async (ctx) => { order.push(`before:${ctx.action}`); },
        after: async (ctx) => { order.push(`after:${ctx.action}`); },
      },
    ]);

    await dispatcher.dispatch({ action: 'setState', params: { statePath: '/test', value: 42 } }, resolve);

    expect(order).toEqual(['before:setState', 'after:setState']);
    expect(store.get('/test')).toBe(42);
  });

  it('before middleware can modify params via setParam', async () => {
    const { store, dispatcher, resolve } = setup([
      {
        name: 'injector',
        before: async (ctx) => {
          if (ctx.action === 'setState') {
            ctx.setParam('value', 'injected');
          }
        },
      },
    ]);

    await dispatcher.dispatch({ action: 'setState', params: { statePath: '/test', value: 'original' } }, resolve);
    expect(store.get('/test')).toBe('injected');
  });

  it('onError middleware runs when action throws', async () => {
    let caughtError: Error | null = null;
    const { dispatcher, resolve } = setup([
      {
        name: 'error-tracker',
        onError: async (_ctx, err) => { caughtError = err; },
      },
    ]);

    // setState without statePath throws
    await expect(
      dispatcher.dispatch({ action: 'setState', params: { value: 42 } }, resolve)
    ).rejects.toThrow();

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toContain('statePath');
  });

  it('middleware runs for custom actions too', async () => {
    const order: string[] = [];
    const store = createStateStore({});
    const customActions = new Map();
    customActions.set('myAction', {
      name: 'myAction',
      handler: async () => { order.push('executed'); },
    });

    const dispatcher = createActionDispatcher({
      store,
      customActions,
      middleware: [{
        name: 'tracker',
        before: async (ctx) => { order.push(`before:${ctx.action}`); },
        after: async (ctx) => { order.push(`after:${ctx.action}`); },
      }],
    });

    await dispatcher.dispatch({ action: 'myAction', params: {} }, (e) => e);
    expect(order).toEqual(['before:myAction', 'executed', 'after:myAction']);
  });

  it('multiple middleware execute in order', async () => {
    const order: string[] = [];
    const { dispatcher, resolve } = setup([
      { name: 'first', before: async () => { order.push('first'); } },
      { name: 'second', before: async () => { order.push('second'); } },
      { name: 'third', before: async () => { order.push('third'); } },
    ]);

    await dispatcher.dispatch({ action: 'setState', params: { statePath: '/x', value: 1 } }, resolve);
    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('dispatcher works normally with no middleware', async () => {
    const { store, dispatcher, resolve } = setup([]);
    await dispatcher.dispatch({ action: 'setState', params: { statePath: '/test', value: 'ok' } }, resolve);
    expect(store.get('/test')).toBe('ok');
  });

  it('before middleware can read state', async () => {
    const { store, dispatcher, resolve } = setup([
      {
        name: 'reader',
        before: async (ctx) => {
          const val = ctx.getState('/existing');
          ctx.setParam('value', `read:${val}`);
        },
      },
    ]);
    store.set('/existing', 'hello');

    await dispatcher.dispatch({ action: 'setState', params: { statePath: '/result', value: '' } }, resolve);
    expect(store.get('/result')).toBe('read:hello');
  });
});
