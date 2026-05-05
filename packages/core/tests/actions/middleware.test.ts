import { describe, it, expect } from 'vitest';
import { createMiddlewareChain } from '../../src/actions/middleware.js';
import type { MiddlewareContext } from '../../src/actions/middleware.js';

function createContext(overrides: Partial<MiddlewareContext> = {}): MiddlewareContext {
  const params: Record<string, unknown> = { ...overrides.params };
  return {
    action: overrides.action ?? 'test',
    params,
    getState: overrides.getState ?? (() => undefined),
    setParam: (k, v) => { params[k] = v; },
  };
}

describe('Middleware Chain', () => {
  it('before hooks run in order', async () => {
    const order: string[] = [];
    const chain = createMiddlewareChain([
      { name: 'first', before: async () => { order.push('before-1'); } },
      { name: 'second', before: async () => { order.push('before-2'); } },
      { name: 'third', before: async () => { order.push('before-3'); } },
    ]);

    await chain.executeBefore(createContext());
    expect(order).toEqual(['before-1', 'before-2', 'before-3']);
  });

  it('after hooks run in order', async () => {
    const order: string[] = [];
    const chain = createMiddlewareChain([
      { name: 'first', after: async () => { order.push('after-1'); } },
      { name: 'second', after: async () => { order.push('after-2'); } },
    ]);

    await chain.executeAfter(createContext(), 'result');
    expect(order).toEqual(['after-1', 'after-2']);
  });

  it('onError hooks run when action fails', async () => {
    let errorCaught: Error | null = null;
    const chain = createMiddlewareChain([
      { name: 'error-handler', onError: async (_ctx, err) => { errorCaught = err; } },
    ]);

    await chain.executeOnError(createContext(), new Error('test failure'));
    expect(errorCaught?.message).toBe('test failure');
  });

  it('before middleware can modify params via setParam', async () => {
    const chain = createMiddlewareChain([
      { name: 'modifier', before: async (ctx) => { ctx.setParam('injected', true); } },
    ]);

    const ctx = createContext({ params: { original: 'value' } });
    await chain.executeBefore(ctx);
    expect(ctx.params.injected).toBe(true);
    expect(ctx.params.original).toBe('value');
  });

  it('works with empty middleware array', async () => {
    const chain = createMiddlewareChain([]);
    await expect(chain.executeBefore(createContext())).resolves.toBeUndefined();
    await expect(chain.executeAfter(createContext(), null)).resolves.toBeUndefined();
    await expect(chain.executeOnError(createContext(), new Error('x'))).resolves.toBeUndefined();
  });

  it('middleware without hooks is skipped gracefully', async () => {
    const chain = createMiddlewareChain([
      { name: 'empty' },
      { name: 'has-before', before: async () => {} },
    ]);

    await expect(chain.executeBefore(createContext())).resolves.toBeUndefined();
  });

  it('before hook receives action name', async () => {
    let receivedAction = '';
    const chain = createMiddlewareChain([
      { name: 'checker', before: async (ctx) => { receivedAction = ctx.action; } },
    ]);

    await chain.executeBefore(createContext({ action: 'login' }));
    expect(receivedAction).toBe('login');
  });

  it('after hook receives result', async () => {
    let receivedResult: unknown = null;
    const chain = createMiddlewareChain([
      { name: 'logger', after: async (_ctx, result) => { receivedResult = result; } },
    ]);

    await chain.executeAfter(createContext(), { data: 'test' });
    expect(receivedResult).toEqual({ data: 'test' });
  });

  it('before hook can read state via getState', async () => {
    let stateValue: unknown = null;
    const chain = createMiddlewareChain([
      { name: 'reader', before: async (ctx) => { stateValue = ctx.getState('/auth/user'); } },
    ]);

    await chain.executeBefore(createContext({
      getState: (path) => path === '/auth/user' ? { name: 'John' } : undefined,
    }));
    expect(stateValue).toEqual({ name: 'John' });
  });

  it('middleware error in before does not prevent other error hooks', async () => {
    const errors: string[] = [];
    const chain = createMiddlewareChain([
      { name: 'a', onError: async () => { errors.push('a'); } },
      { name: 'b', onError: async () => { errors.push('b'); } },
    ]);

    await chain.executeOnError(createContext(), new Error('x'));
    expect(errors).toEqual(['a', 'b']);
  });
});
