import { describe, it, expect } from 'vitest';
import { createActionDispatcher } from '../../src/actions/dispatcher.js';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';

describe('ActionDispatcher', () => {
  function setup(initialState: Record<string, unknown> = {}) {
    const store = createStateStore(initialState);
    const resolver = createResolver({ store });
    const dispatcher = createActionDispatcher({ store });
    const resolve = (expr: unknown) => resolver.resolve(expr);
    return { store, dispatcher, resolve };
  }

  describe('setState', () => {
    it('sets a value at the given path', async () => {
      const { store, dispatcher, resolve } = setup({ form: { name: '' } });
      await dispatcher.dispatch({ action: 'setState', params: { statePath: '/form/name', value: 'Alice' } }, resolve);
      expect(store.get('/form/name')).toBe('Alice');
    });

    it('resolves expression params', async () => {
      const { store, dispatcher, resolve } = setup({ source: 'hello', target: '' });
      await dispatcher.dispatch({
        action: 'setState',
        params: { statePath: '/target', value: { $state: '/source' } },
      }, resolve);
      expect(store.get('/target')).toBe('hello');
    });

    it('throws without statePath', async () => {
      const { dispatcher, resolve } = setup();
      await expect(dispatcher.dispatch({ action: 'setState', params: { value: 'x' } }, resolve))
        .rejects.toThrow('statePath');
    });
  });

  describe('skipIf', () => {
    it('skips an action when skipIf resolves truthy', async () => {
      const store = createStateStore({ shouldSkip: true });
      const resolver = createResolver({ store });
      let fetchCalled = false;
      const dispatcher = createActionDispatcher({
        store,
        fetcher: async () => {
          fetchCalled = true;
          return { ok: true, status: 200, json: async () => ({ ok: true }) } as Response;
        },
      });
      const resolve = (expr: unknown) => resolver.resolve(expr);

      await dispatcher.dispatch({
        action: 'fetch',
        params: {
          skipIf: { $state: '/shouldSkip' },
          url: 'https://example.com/create-only-data',
          target: '/result',
        },
      }, resolve);

      expect(fetchCalled).toBe(false);
      expect(store.get('/result')).toBeUndefined();
      expect(store.get('/ui/loading')).toBeUndefined();
    });

    it('runs an action when skipIf resolves falsey', async () => {
      const store = createStateStore({ shouldSkip: false });
      const resolver = createResolver({ store });
      let fetchCalled = false;
      const dispatcher = createActionDispatcher({
        store,
        fetcher: async () => {
          fetchCalled = true;
          return { ok: true, status: 200, json: async () => ({ loaded: true }) } as Response;
        },
      });
      const resolve = (expr: unknown) => resolver.resolve(expr);

      await dispatcher.dispatch({
        action: 'fetch',
        params: {
          skipIf: { $state: '/shouldSkip' },
          url: 'https://example.com/create-only-data',
          target: '/result',
        },
      }, resolve);

      expect(fetchCalled).toBe(true);
      expect(store.get('/result')).toEqual({ loaded: true });
      expect(store.get('/ui/loading')).toBe(false);
    });

    it('does not pass skipIf through to executed action handlers', async () => {
      const { dispatcher, resolve } = setup({ shouldSkip: false });
      let receivedParams: Record<string, unknown> | undefined;
      dispatcher.registerAction({
        name: 'captureParams',
        handler: (params) => {
          receivedParams = params;
        },
      });

      await dispatcher.dispatch({
        action: 'captureParams',
        params: {
          skipIf: { $state: '/shouldSkip' },
          value: 'kept',
        },
      }, resolve);

      expect(receivedParams).toEqual({ value: 'kept' });
    });
  });

  describe('navigate', () => {
    it('sets navigation intent in state', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({
        action: 'navigate',
        params: { screen: 'patient-detail', id: '123' },
      }, resolve);
      const intent = store.get('/navigation/intent') as Record<string, unknown>;
      expect(intent.screen).toBe('patient-detail');
    });
  });

  describe('openModal / closeModal', () => {
    it('opens a modal by setting state', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({ action: 'openModal', params: { id: 'confirm' } }, resolve);
      expect(store.get('/ui/modals/confirm')).toBe(true);
    });

    it('closes a modal', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({ action: 'openModal', params: { id: 'confirm' } }, resolve);
      await dispatcher.dispatch({ action: 'closeModal', params: { id: 'confirm' } }, resolve);
      expect(store.get('/ui/modals/confirm')).toBe(false);
    });
  });

  describe('openDrawer / closeDrawer', () => {
    it('opens and closes drawer', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({ action: 'openDrawer', params: { id: 'menu' } }, resolve);
      expect(store.get('/ui/drawers/menu')).toBe(true);
      await dispatcher.dispatch({ action: 'closeDrawer', params: { id: 'menu' } }, resolve);
      expect(store.get('/ui/drawers/menu')).toBe(false);
    });
  });

  describe('toggleTheme', () => {
    it('toggles between dark and light', async () => {
      const { store, dispatcher, resolve } = setup({ preferences: { theme: 'light' } });
      await dispatcher.dispatch({ action: 'toggleTheme' }, resolve);
      expect(store.get('/preferences/theme')).toBe('dark');
      await dispatcher.dispatch({ action: 'toggleTheme' }, resolve);
      expect(store.get('/preferences/theme')).toBe('light');
    });
  });

  describe('setLocale', () => {
    it('sets the locale', async () => {
      const { store, dispatcher, resolve } = setup({ preferences: {} });
      await dispatcher.dispatch({ action: 'setLocale', params: { locale: 'es' } }, resolve);
      expect(store.get('/preferences/locale')).toBe('es');
    });
  });

  describe('showNotification', () => {
    it('appends a notification with message and type', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({
        action: 'showNotification',
        params: { message: 'Saved!', type: 'success' },
      }, resolve);
      const notifs = store.get('/ui/notifications') as Record<string, unknown>[];
      expect(notifs).toHaveLength(1);
      expect(notifs[0].message).toBe('Saved!');
      expect(notifs[0].type).toBe('success');
    });

    it('generates unique id with crypto.randomUUID and timestamp', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({
        action: 'showNotification',
        params: { message: 'Test', type: 'info' },
      }, resolve);
      const notifs = store.get('/ui/notifications') as Record<string, unknown>[];
      expect(notifs).toHaveLength(1);
      expect(typeof notifs[0].id).toBe('string');
      expect(notifs[0].id).toMatch(/^[0-9a-f-]{36}$/);
      expect(typeof notifs[0].timestamp).toBe('number');
    });

    it('defaults type to info when not provided', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({
        action: 'showNotification',
        params: { message: 'Hello' },
      }, resolve);
      const notifs = store.get('/ui/notifications') as Record<string, unknown>[];
      expect(notifs[0].type).toBe('info');
    });

    it('stores title when provided', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({
        action: 'showNotification',
        params: { title: 'Error', message: 'Server failed', type: 'error' },
      }, resolve);
      const notifs = store.get('/ui/notifications') as Record<string, unknown>[];
      expect(notifs[0].title).toBe('Error');
      expect(notifs[0].message).toBe('Server failed');
    });

    it('stores custom duration and null duration', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({
        action: 'showNotification',
        params: { message: 'Quick', duration: 2000 },
      }, resolve);
      await dispatcher.dispatch({
        action: 'showNotification',
        params: { message: 'Sticky', duration: null },
      }, resolve);
      const notifs = store.get('/ui/notifications') as Record<string, unknown>[];
      expect(notifs[0].duration).toBe(2000);
      expect(notifs[1].duration).toBeNull();
    });

    it('accumulates notifications without replacing', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({ action: 'showNotification', params: { message: 'First' } }, resolve);
      await dispatcher.dispatch({ action: 'showNotification', params: { message: 'Second' } }, resolve);
      await dispatcher.dispatch({ action: 'showNotification', params: { message: 'Third' } }, resolve);
      const notifs = store.get('/ui/notifications') as Record<string, unknown>[];
      expect(notifs).toHaveLength(3);
      expect(notifs[0].message).toBe('First');
      expect(notifs[2].message).toBe('Third');
    });
  });

  describe('dismissNotification', () => {
    it('removes a notification by id', async () => {
      const { store, dispatcher, resolve } = setup();
      store.set('/ui/notifications', [
        { id: 'aaa', message: 'First', type: 'info' },
        { id: 'bbb', message: 'Second', type: 'error' },
        { id: 'ccc', message: 'Third', type: 'success' },
      ]);
      await dispatcher.dispatch({
        action: 'dismissNotification',
        params: { id: 'bbb' },
      }, resolve);
      const notifs = store.get('/ui/notifications') as Record<string, unknown>[];
      expect(notifs).toHaveLength(2);
      expect(notifs.map(n => n.id)).toEqual(['aaa', 'ccc']);
    });

    it('does nothing when id not found', async () => {
      const { store, dispatcher, resolve } = setup();
      store.set('/ui/notifications', [
        { id: 'aaa', message: 'First', type: 'info' },
      ]);
      await dispatcher.dispatch({
        action: 'dismissNotification',
        params: { id: 'nonexistent' },
      }, resolve);
      const notifs = store.get('/ui/notifications') as Record<string, unknown>[];
      expect(notifs).toHaveLength(1);
    });

    it('handles empty notifications array', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({
        action: 'dismissNotification',
        params: { id: 'any' },
      }, resolve);
      const notifs = store.get('/ui/notifications') as unknown[];
      expect(notifs).toEqual([]);
    });
  });

  describe('goBack', () => {
    it('sets goBack intent', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({ action: 'goBack' }, resolve);
      const intent = store.get('/navigation/intent') as Record<string, unknown>;
      expect(intent.action).toBe('goBack');
    });
  });

  describe('deep param resolution', () => {
    it('resolves nested expressions in params', async () => {
      const { store, dispatcher, resolve } = setup({ form: { name: 'Alice', age: 30 } });
      await dispatcher.dispatch({
        action: 'setState',
        params: {
          statePath: '/result',
          value: {
            name: { $state: '/form/name' },
            age: { $state: '/form/age' },
          },
        },
      }, resolve);
      expect(store.get('/result')).toEqual({ name: 'Alice', age: 30 });
    });

    it('resolves expressions nested inside arrays in params', async () => {
      const { store, dispatcher, resolve } = setup({ items: ['a', 'b'] });
      await dispatcher.dispatch({
        action: 'setState',
        params: {
          statePath: '/result',
          value: [{ $state: '/items' }],
        },
      }, resolve);
      expect(store.get('/result')).toEqual([['a', 'b']]);
    });

    it('resolves deeply nested mixed objects and expressions', async () => {
      const { store, dispatcher, resolve } = setup({ user: { email: 'a@b.com' } });
      await dispatcher.dispatch({
        action: 'setState',
        params: {
          statePath: '/result',
          value: {
            contact: {
              email: { $state: '/user/email' },
              verified: true,
            },
          },
        },
      }, resolve);
      expect(store.get('/result')).toEqual({
        contact: { email: 'a@b.com', verified: true },
      });
    });
  });

  describe('fetch body sanitization', () => {
    it('converts empty strings to null in fetch body', async () => {
      const { store, dispatcher, resolve } = setup();
      let capturedBody: string | undefined;
      // Mock globalThis.fetch
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (_url: unknown, options?: RequestInit) => {
        capturedBody = options?.body as string;
        return { ok: true, status: 200, json: async () => ({}) } as Response;
      };

      await dispatcher.dispatch({
        action: 'fetch',
        params: {
          url: 'https://example.com/api',
          method: 'POST',
          body: { name: 'Alice', email: '', age: 0, notes: null },
        },
      }, resolve);

      globalThis.fetch = originalFetch;

      const parsed = JSON.parse(capturedBody!);
      expect(parsed.name).toBe('Alice');
      expect(parsed.email).toBeNull();   // "" → null
      expect(parsed.age).toBe(0);        // 0 stays as 0
      expect(parsed.notes).toBeNull();   // null stays null
    });
  });

  describe('fetch errorTarget', () => {
    it('writes HTTP errors to errorTarget without changing the success target', async () => {
      const store = createStateStore({ data: { existing: true } });
      const resolver = createResolver({ store });
      const dispatcher = createActionDispatcher({
        store,
        fetcher: async () => ({
          ok: false,
          status: 500,
          json: async () => ({ error: { message: 'database failed' } }),
        } as Response),
      });

      await dispatcher.dispatch({
        action: 'fetch',
        params: {
          url: 'https://api.test/orders/1',
          target: '/data',
          errorTarget: '/ui/loadErrors/order-form',
        },
      }, (expr) => resolver.resolve(expr));

      const expectedError = {
        status: 500,
        message: 'HTTP 500',
        data: { error: { message: 'database failed' } },
      };
      expect(store.get('/data')).toEqual({ existing: true });
      expect(store.get('/ui/lastError')).toEqual(expectedError);
      expect(store.get('/ui/loadErrors/order-form')).toEqual(expectedError);
    });

    it('clears errorTarget after a successful fetch', async () => {
      const store = createStateStore({
        ui: { loadErrors: { orderForm: { message: 'old error' } } },
      });
      const resolver = createResolver({ store });
      const dispatcher = createActionDispatcher({
        store,
        fetcher: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ id: 1, total: 120 }),
        } as Response),
      });

      await dispatcher.dispatch({
        action: 'fetch',
        params: {
          url: 'https://api.test/orders/1',
          target: '/form',
          errorTarget: '/ui/loadErrors/orderForm',
        },
      }, (expr) => resolver.resolve(expr));

      expect(store.get('/form')).toEqual({ id: 1, total: 120 });
      expect(store.get('/ui/loadErrors/orderForm')).toBeNull();
      expect(store.get('/ui/lastError')).toBeNull();
    });

    it('writes network failures to errorTarget', async () => {
      const store = createStateStore();
      const resolver = createResolver({ store });
      const dispatcher = createActionDispatcher({
        store,
        fetcher: async () => {
          throw new Error('connection refused');
        },
      });

      await dispatcher.dispatch({
        action: 'fetch',
        params: {
          url: 'https://api.test/orders/1',
          errorTarget: '/ui/loadErrors/orderForm',
        },
      }, (expr) => resolver.resolve(expr));

      expect(store.get('/ui/lastError')).toEqual({ message: 'connection refused' });
      expect(store.get('/ui/loadErrors/orderForm')).toEqual({ message: 'connection refused' });
    });
  });

  describe('submitForm notification format', () => {
    it('creates notification with UUID format when successMessage provided', async () => {
      const { store, dispatcher, resolve } = setup();
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) } as Response);

      await dispatcher.dispatch({
        action: 'submitForm',
        params: { url: 'https://api.test/data', method: 'POST', body: { name: 'Test' }, successMessage: 'Saved!' },
      }, resolve);

      globalThis.fetch = originalFetch;

      const notifs = store.get('/ui/notifications') as Record<string, unknown>[];
      expect(notifs).toHaveLength(1);
      expect(notifs[0].message).toBe('Saved!');
      expect(notifs[0].type).toBe('success');
      expect(typeof notifs[0].id).toBe('string');
      expect(notifs[0].id).toMatch(/^[0-9a-f-]{36}$/); // UUID format, not Date.now()
      expect(typeof notifs[0].timestamp).toBe('number');
    });
  });

  describe('validateForm / touchField / resetForm', () => {
    it('validateForm dispatches without error', async () => {
      const { dispatcher, resolve } = setup({});
      await dispatcher.dispatch({ action: 'validateForm', params: { formId: 'test-form' } }, resolve);
    });

    it('touchField dispatches without error', async () => {
      const { dispatcher, resolve } = setup({});
      await dispatcher.dispatch({ action: 'touchField', params: { formId: 'test-form', field: 'title' } }, resolve);
    });

    it('resetForm dispatches without error', async () => {
      const { dispatcher, resolve } = setup({});
      await dispatcher.dispatch({ action: 'resetForm', params: { formId: 'test-form' } }, resolve);
    });
  });

  describe('submitForm with formId validation gate', () => {
    it('blocks submission when form is invalid', async () => {
      const { store, dispatcher, resolve } = setup({});
      const originalFetch = globalThis.fetch;
      let fetchCalled = false;
      globalThis.fetch = async () => { fetchCalled = true; return { ok: true, status: 200, json: async () => ({}) } as Response; };

      store.set('/ui/forms/task-form/isValid', false);

      await dispatcher.dispatch({
        action: 'submitForm',
        params: { formId: 'task-form', url: 'https://api.test/data', method: 'POST' },
      }, resolve);

      globalThis.fetch = originalFetch;
      expect(fetchCalled).toBe(false);
    });

    it('proceeds when form is valid', async () => {
      const { store, dispatcher, resolve } = setup({});
      const originalFetch = globalThis.fetch;
      let fetchCalled = false;
      globalThis.fetch = async () => { fetchCalled = true; return { ok: true, status: 200, json: async () => ({}) } as Response; };

      store.set('/ui/forms/task-form/isValid', true);

      await dispatcher.dispatch({
        action: 'submitForm',
        params: { formId: 'task-form', url: 'https://api.test/data', method: 'POST' },
      }, resolve);

      globalThis.fetch = originalFetch;
      expect(fetchCalled).toBe(true);
    });

    it('submitForm without formId works as before', async () => {
      const { dispatcher, resolve } = setup({});
      const originalFetch = globalThis.fetch;
      let fetchCalled = false;
      globalThis.fetch = async () => { fetchCalled = true; return { ok: true, status: 200, json: async () => ({}) } as Response; };

      await dispatcher.dispatch({
        action: 'submitForm',
        params: { url: 'https://api.test/data', method: 'POST' },
      }, resolve);

      globalThis.fetch = originalFetch;
      expect(fetchCalled).toBe(true);
    });
  });

  describe('custom actions', () => {
    it('registers and dispatches custom action', async () => {
      const { store, dispatcher, resolve } = setup({ result: '' });
      dispatcher.registerAction({
        name: 'greet',
        handler: (params, setState) => {
          setState('/result', `Hello ${params.name}`);
        },
      });
      await dispatcher.dispatch({ action: 'greet', params: { name: 'Alice' } }, resolve);
      expect(store.get('/result')).toBe('Hello Alice');
    });

    it('throws for unknown action', async () => {
      const { dispatcher, resolve } = setup();
      await expect(dispatcher.dispatch({ action: 'nonexistent' }, resolve))
        .rejects.toThrow('Unknown action: "nonexistent"');
    });
  });

  describe('toggleSelection', () => {
    it('adds value when not in array', async () => {
      const { store, dispatcher, resolve } = setup({ selectedIds: [1, 3] });
      await dispatcher.dispatch({ action: 'toggleSelection', params: { statePath: '/selectedIds', value: 5 } }, resolve);
      expect(store.get('/selectedIds')).toEqual([1, 3, 5]);
    });

    it('removes value when already in array', async () => {
      const { store, dispatcher, resolve } = setup({ selectedIds: [1, 3, 5] });
      await dispatcher.dispatch({ action: 'toggleSelection', params: { statePath: '/selectedIds', value: 3 } }, resolve);
      expect(store.get('/selectedIds')).toEqual([1, 5]);
    });

    it('single mode replaces entire array', async () => {
      const { store, dispatcher, resolve } = setup({ selectedIds: [1] });
      await dispatcher.dispatch({ action: 'toggleSelection', params: { statePath: '/selectedIds', value: 3, mode: 'single' } }, resolve);
      expect(store.get('/selectedIds')).toEqual([3]);
    });

    it('initializes empty array if path is undefined', async () => {
      const { store, dispatcher, resolve } = setup({});
      await dispatcher.dispatch({ action: 'toggleSelection', params: { statePath: '/selectedIds', value: 1 } }, resolve);
      expect(store.get('/selectedIds')).toEqual([1]);
    });
  });

  describe('selectAll', () => {
    it('sets array to provided values', async () => {
      const { store, dispatcher, resolve } = setup({ selectedIds: [] });
      await dispatcher.dispatch({ action: 'selectAll', params: { statePath: '/selectedIds', values: [1, 2, 3] } }, resolve);
      expect(store.get('/selectedIds')).toEqual([1, 2, 3]);
    });
  });

  describe('selectNone', () => {
    it('clears the array', async () => {
      const { store, dispatcher, resolve } = setup({ selectedIds: [1, 2, 3] });
      await dispatcher.dispatch({ action: 'selectNone', params: { statePath: '/selectedIds' } }, resolve);
      expect(store.get('/selectedIds')).toEqual([]);
    });
  });

  describe('copyToClipboard', () => {
    it('stores string value as-is', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({ action: 'copyToClipboard', params: { value: 'hello' } }, resolve);
      const clip = store.get('/ui/clipboard') as { value: string; timestamp: number };
      expect(clip.value).toBe('hello');
      expect(clip.timestamp).toBeGreaterThan(0);
    });

    it('stringifies object value to JSON', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({ action: 'copyToClipboard', params: { value: { primary: '#6366f1', roundness: 0.5 } } }, resolve);
      const clip = store.get('/ui/clipboard') as { value: string; timestamp: number };
      expect(clip.value).toBe(JSON.stringify({ primary: '#6366f1', roundness: 0.5 }, null, 2));
    });

    it('stores number value as-is', async () => {
      const { store, dispatcher, resolve } = setup();
      await dispatcher.dispatch({ action: 'copyToClipboard', params: { value: 42 } }, resolve);
      const clip = store.get('/ui/clipboard') as { value: number };
      expect(clip.value).toBe(42);
    });
  });
});
