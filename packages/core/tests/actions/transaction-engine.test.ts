import { describe, it, expect } from 'vitest';
import { createTransactionEngine } from '../../src/actions/transaction-engine.js';
import { createActionDispatcher } from '../../src/actions/dispatcher.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import type { ActionDefinition } from '../../src/types.js';

function setup(initialState: Record<string, unknown> = {}, customActions?: Map<string, ActionDefinition>) {
  const store = createStateStore(initialState);
  const resolver = createResolver({ store });
  const dispatcher = createActionDispatcher({ store, customActions });
  const resolve = (expr: unknown) => resolver.resolve(expr);
  const engine = createTransactionEngine({ store, dispatcher, resolve });
  return { store, dispatcher, resolve, engine };
}

function mockFetchSuccess(response: unknown = {}) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => response,
  } as Response);
  return () => { globalThis.fetch = original; };
}

function mockFetchFailure(errorMessage = 'Network error') {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error(errorMessage); };
  return () => { globalThis.fetch = original; };
}

function mockFetchHttpError(status = 400, data: unknown = { detail: 'Bad request' }) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status,
    json: async () => data,
  } as Response);
  return () => { globalThis.fetch = original; };
}

describe('TransactionEngine', () => {
  describe('phase execution order', () => {
    it('executes phases in correct order: before → optimistic → confirm → onSuccess', async () => {
      const order: string[] = [];
      const customActions = new Map<string, ActionDefinition>([
        ['track', {
          name: 'track',
          handler: (params) => { order.push(params.phase as string); },
        }],
      ]);

      const { engine } = setup({}, customActions);
      const restore = mockFetchSuccess();

      await engine.execute({
        before: [{ action: 'track', params: { phase: 'before' } }],
        optimistic: [{ action: 'track', params: { phase: 'optimistic' } }],
        confirm: [{ action: 'fetch', params: { url: 'https://api.test/x', method: 'POST' } }],
        onSuccess: [{ action: 'track', params: { phase: 'onSuccess' } }],
      });

      restore();
      expect(order).toEqual(['before', 'optimistic', 'onSuccess']);
    });

    it('executes onError (not onSuccess) on failure', async () => {
      const order: string[] = [];
      const customActions = new Map<string, ActionDefinition>([
        ['track', {
          name: 'track',
          handler: (params) => { order.push(params.phase as string); },
        }],
      ]);

      const { engine } = setup({}, customActions);
      const restore = mockFetchFailure();

      await engine.execute({
        before: [{ action: 'track', params: { phase: 'before' } }],
        optimistic: [{ action: 'track', params: { phase: 'optimistic' } }],
        confirm: [{ action: 'fetch', params: { url: 'https://api.test/x', method: 'POST' } }],
        onSuccess: [{ action: 'track', params: { phase: 'onSuccess' } }],
        onError: [{ action: 'track', params: { phase: 'onError' } }],
      });

      restore();
      expect(order).toEqual(['before', 'optimistic', 'onError']);
      expect(order).not.toContain('onSuccess');
    });
  });

  describe('snapshot and rollback', () => {
    it('rolls back optimistic changes on confirm failure', async () => {
      const { store, engine } = setup({ tasks: ['a', 'b'], ui: { modals: {} } });
      const restore = mockFetchFailure();

      await engine.execute({
        before: [{ action: 'closeModal', params: { id: 'task-modal' } }],
        optimistic: [
          { action: 'setState', params: { statePath: '/tasks', value: ['a', 'b', 'c'] } },
        ],
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/tasks', method: 'POST' } },
        ],
        onError: [
          { action: 'showNotification', params: { message: 'Failed', type: 'error' } },
        ],
      });

      restore();

      // Tasks rolled back
      expect(store.get('/tasks')).toEqual(['a', 'b']);
      // Modal stays closed (before is NOT rolled back)
      expect(store.get('/ui/modals/task-modal')).toBe(false);
      // Notification shown
      const notifs = store.get('/ui/notifications') as unknown[];
      expect(notifs).toHaveLength(1);
    });

    it('does NOT rollback on success', async () => {
      const { store, engine } = setup({ tasks: ['a'] });
      const restore = mockFetchSuccess();

      await engine.execute({
        optimistic: [
          { action: 'setState', params: { statePath: '/tasks', value: ['a', 'b'] } },
        ],
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/tasks', method: 'POST' } },
        ],
      });

      restore();
      expect(store.get('/tasks')).toEqual(['a', 'b']);
    });

    it('rolls back on HTTP error (non-ok status)', async () => {
      const { store, engine } = setup({ tasks: ['a', 'b'] });
      const restore = mockFetchHttpError(400);

      await engine.execute({
        optimistic: [
          { action: 'setState', params: { statePath: '/tasks', value: ['a', 'b', 'c'] } },
        ],
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/tasks', method: 'POST' } },
        ],
        onError: [
          { action: 'showNotification', params: { message: 'HTTP error', type: 'error' } },
        ],
      });

      restore();
      expect(store.get('/tasks')).toEqual(['a', 'b']);
    });
  });

  describe('confirm result access', () => {
    it('makes /tx/result available during onSuccess', async () => {
      let resultDuringOnSuccess: unknown;
      const customActions = new Map<string, ActionDefinition>([
        ['capture', {
          name: 'capture',
          handler: (_params, _setState, getState) => {
            resultDuringOnSuccess = getState('/tx/result');
          },
        }],
      ]);

      const { engine } = setup({}, customActions);
      const restore = mockFetchSuccess({ id: 'uuid-123', title: 'New Task' });

      await engine.execute({
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/tasks', method: 'POST', target: '/tx/result' } },
        ],
        onSuccess: [{ action: 'capture' }],
      });

      restore();
      expect(resultDuringOnSuccess).toEqual({ id: 'uuid-123', title: 'New Task' });
    });

    it('makes /tx/error available during onError', async () => {
      let errorDuringOnError: unknown;
      const customActions = new Map<string, ActionDefinition>([
        ['capture', {
          name: 'capture',
          handler: (_params, _setState, getState) => {
            errorDuringOnError = getState('/tx/error');
          },
        }],
      ]);

      const { engine } = setup({}, customActions);
      const restore = mockFetchFailure('Connection refused');

      await engine.execute({
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/tasks', method: 'POST' } },
        ],
        onError: [{ action: 'capture' }],
      });

      restore();
      expect(errorDuringOnError).toBeDefined();
      expect((errorDuringOnError as Record<string, unknown>).message).toBeDefined();
    });

    it('preserves backend HTTP error details during onError after rollback', async () => {
      let errorDuringOnError: unknown;
      const backendError = {
        error: {
          code: 'MECANICO_INVALIDO',
          message: 'Mecanico invalido para esta orden',
        },
      };
      const customActions = new Map<string, ActionDefinition>([
        ['capture', {
          name: 'capture',
          handler: (_params, _setState, getState) => {
            errorDuringOnError = getState('/tx/error');
          },
        }],
      ]);

      const { store, engine } = setup({ tasks: ['a', 'b'] }, customActions);
      const restore = mockFetchHttpError(400, backendError);

      await engine.execute({
        optimistic: [
          { action: 'setState', params: { statePath: '/tasks', value: ['a', 'b', 'c'] } },
        ],
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/tasks', method: 'POST' } },
        ],
        onError: [{ action: 'capture' }],
      });

      restore();
      expect(store.get('/tasks')).toEqual(['a', 'b']);
      expect(errorDuringOnError).toMatchObject({
        status: 400,
        code: 'MECANICO_INVALIDO',
        message: 'Mecanico invalido para esta orden',
        data: backendError,
      });
    });

    it('preserves custom Error properties during onError after rollback', async () => {
      let errorDuringOnError: unknown;
      const customActions = new Map<string, ActionDefinition>([
        ['throwHttpError', {
          name: 'throwHttpError',
          handler: () => {
            const err = new Error('Backend unavailable') as Error & {
              code: string;
              status: number;
              details: { retryAfter: number };
            };
            err.code = 'SERVICE_UNAVAILABLE';
            err.status = 503;
            err.details = { retryAfter: 30 };
            throw err;
          },
        }],
        ['capture', {
          name: 'capture',
          handler: (_params, _setState, getState) => {
            errorDuringOnError = getState('/tx/error');
          },
        }],
      ]);

      const { store, engine } = setup({ tasks: ['a'] }, customActions);

      await engine.execute({
        optimistic: [
          { action: 'setState', params: { statePath: '/tasks', value: ['a', 'b'] } },
        ],
        confirm: [{ action: 'throwHttpError' }],
        onError: [{ action: 'capture' }],
      });

      expect(store.get('/tasks')).toEqual(['a']);
      expect(errorDuringOnError).toMatchObject({
        message: 'Backend unavailable',
        code: 'SERVICE_UNAVAILABLE',
        status: 503,
        details: { retryAfter: 30 },
      });
    });
  });

  describe('tx cleanup', () => {
    it('cleans up /tx/* after successful transaction', async () => {
      const { store, engine } = setup({});
      const restore = mockFetchSuccess({ id: 1 });

      await engine.execute({
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/tasks', method: 'POST', target: '/tx/result' } },
        ],
      });

      restore();
      expect(store.get('/tx')).toBeUndefined();
    });

    it('cleans up /tx/* after failed transaction', async () => {
      const { store, engine } = setup({});
      const restore = mockFetchFailure();

      await engine.execute({
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/tasks', method: 'POST' } },
        ],
      });

      restore();
      expect(store.get('/tx')).toBeUndefined();
    });
  });

  describe('timeout', () => {
    it('rolls back on timeout and executes onError', async () => {
      const { store, engine } = setup({ data: 'original' });

      const original = globalThis.fetch;
      // Fetch that never resolves
      globalThis.fetch = () => new Promise(() => {});

      await engine.execute({
        optimistic: [
          { action: 'setState', params: { statePath: '/data', value: 'optimistic' } },
        ],
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/slow', method: 'POST' } },
        ],
        onError: [
          { action: 'showNotification', params: { message: 'Timeout', type: 'error' } },
        ],
        timeout: 50,
      });

      globalThis.fetch = original;

      expect(store.get('/data')).toBe('original');
      const notifs = store.get('/ui/notifications') as unknown[];
      expect(notifs).toHaveLength(1);
    });
  });

  describe('queue (serialization)', () => {
    it('serializes concurrent transactions', async () => {
      const order: string[] = [];
      const customActions = new Map<string, ActionDefinition>([
        ['track', {
          name: 'track',
          handler: (params) => { order.push(params.label as string); },
        }],
      ]);

      const { engine } = setup({ counter: 0 }, customActions);

      const fetchResolvers: Array<() => void> = [];
      const original = globalThis.fetch;
      globalThis.fetch = () => new Promise<Response>((res) => {
        fetchResolvers.push(() => res({ ok: true, status: 200, json: async () => ({}) } as Response));
      });

      // Fire two transactions without awaiting
      const p1 = engine.execute({
        optimistic: [{ action: 'track', params: { label: 'A-optimistic' } }],
        confirm: [{ action: 'fetch', params: { url: 'https://api.test/a', method: 'POST' } }],
        onSuccess: [{ action: 'track', params: { label: 'A-success' } }],
      });

      const p2 = engine.execute({
        optimistic: [{ action: 'track', params: { label: 'B-optimistic' } }],
        confirm: [{ action: 'fetch', params: { url: 'https://api.test/b', method: 'POST' } }],
        onSuccess: [{ action: 'track', params: { label: 'B-success' } }],
      });

      // Only A should have started (optimistic runs sync, but wrapped in async)
      await new Promise((r) => setTimeout(r, 10));
      expect(order).toEqual(['A-optimistic']);

      // Resolve A's fetch
      fetchResolvers[0]();
      await new Promise((r) => setTimeout(r, 10));

      // A completed, B started
      expect(order).toContain('A-success');
      expect(order).toContain('B-optimistic');

      // Resolve B's fetch
      fetchResolvers[1]();
      await Promise.all([p1, p2]);

      expect(order).toEqual(['A-optimistic', 'A-success', 'B-optimistic', 'B-success']);

      globalThis.fetch = original;
    });
  });

  describe('optional phases', () => {
    it('works with only confirm (minimal transaction)', async () => {
      const { engine } = setup({});
      const restore = mockFetchSuccess();

      await engine.execute({
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/ping', method: 'GET' } },
        ],
      });

      restore();
      // No error = success
    });

    it('handles empty before and optimistic gracefully', async () => {
      const { engine } = setup({});
      const restore = mockFetchSuccess();

      await engine.execute({
        before: [],
        optimistic: [],
        confirm: [
          { action: 'fetch', params: { url: 'https://api.test/test', method: 'GET' } },
        ],
      });

      restore();
    });
  });
});
