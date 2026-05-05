import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createDataSourcesEngine } from '../../src/data/data-sources.js';
import type { DataSourcesEngine } from '../../src/data/data-sources.js';
import type { StateStore } from '../../src/state/store.js';
import type { Resolver } from '../../src/expressions/resolver.js';

/**
 * DataSourcesEngine — declarative, reactive data fetching.
 *
 * A dataSource declares: WHERE to fetch (url), WHAT to watch (params),
 * WHERE to store (target), and WHEN to re-fetch (trigger: auto|manual).
 */

function mockFetcher(data: unknown = {}, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

function createTestResolver(store: StateStore): Resolver {
  return createResolver({ store });
}

describe('DataSourcesEngine', () => {
  let store: StateStore;
  let resolver: Resolver;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Initial fetch on mount ───

  describe('initialFetch', () => {
    it('fetches all dataSources with initialFetch:true on mount', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([{ id: 1, name: 'Task 1' }]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
            initialFetch: true,
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(store.get('/tasks')).toEqual([{ id: 1, name: 'Task 1' }]);
    });

    it('does not fetch dataSources with initialFetch:false on mount', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher({ data: 'test' });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          catalogs: {
            url: 'https://api.example.com/catalogs',
            target: '/catalogs',
            initialFetch: false,
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      expect(fetcher).not.toHaveBeenCalled();
      expect(store.get('/catalogs')).toBeUndefined();
    });

    it('defaults initialFetch to true when not specified', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher({ ok: true });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          data: {
            url: 'https://api.example.com/data',
            target: '/data',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Loading / error state paths ───

  describe('auto-generated state paths', () => {
    it('sets loading state during fetch', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);

      let resolveFetch!: (v: unknown) => void;
      const fetcher = vi.fn().mockReturnValue(
        new Promise((r) => { resolveFetch = r; }),
      );

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
          },
        },
      });

      engine.mount();
      // Let microtasks run but fetch is still pending
      await Promise.resolve();

      expect(store.get('/tasksLoading')).toBe(true);
      expect(store.get('/tasksError')).toBeNull();

      resolveFetch({ ok: true, status: 200, json: () => Promise.resolve([]) });
      await vi.runAllTimersAsync();

      expect(store.get('/tasksLoading')).toBe(false);
    });

    it('writes error to error path on HTTP failure', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher(null, false, 404);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      expect(store.get('/tasksLoading')).toBe(false);
      expect(store.get('/tasksError')).toEqual({
        status: 404,
        message: 'HTTP 404',
      });
    });

    it('writes error on network failure', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      expect(store.get('/tasksLoading')).toBe(false);
      expect((store.get('/tasksError') as Record<string, unknown>).message).toBe('Network error');
    });
  });

  // ─── Auto-trigger on param change ───

  describe('auto-trigger reactivity', () => {
    it('re-fetches when a param dependency changes (trigger: auto)', async () => {
      store = createStateStore({ filter: { status: 'active' }, pagination: { page: 1 } });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher({ data: [] });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
            trigger: 'auto',
            params: {
              status: { $state: '/filter/status' },
              page: { $state: '/pagination/page' },
            },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(1); // initial fetch

      // Change a param dependency
      store.set('/filter/status', 'completed');
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('does not re-fetch when unrelated state changes', async () => {
      store = createStateStore({ filter: { status: 'active' }, unrelated: 'foo' });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher({ data: [] });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
            trigger: 'auto',
            params: {
              status: { $state: '/filter/status' },
            },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(1);

      store.set('/unrelated', 'bar');
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(1); // no re-fetch
    });

    it('defaults trigger to auto when not specified', async () => {
      store = createStateStore({ filter: { page: 1 } });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          items: {
            url: 'https://api.example.com/items',
            target: '/items',
            params: {
              page: { $state: '/filter/page' },
            },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      store.set('/filter/page', 2);
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Manual trigger ───

  describe('manual trigger', () => {
    it('does not re-fetch on param change when trigger is manual', async () => {
      store = createStateStore({ filter: { status: 'active' } });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          catalogs: {
            url: 'https://api.example.com/catalogs',
            target: '/catalogs',
            trigger: 'manual',
            params: {
              status: { $state: '/filter/status' },
            },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(1); // initial fetch

      store.set('/filter/status', 'inactive');
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(1); // no re-fetch
    });
  });

  // ─── Debounce ───

  describe('debounce', () => {
    it('batches rapid param changes within debounce window', async () => {
      store = createStateStore({ filter: { search: '' } });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          results: {
            url: 'https://api.example.com/search',
            target: '/results',
            trigger: 'auto',
            debounce: 300,
            params: {
              search: { $state: '/filter/search' },
            },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(1); // initial

      // Rapid changes within 300ms
      store.set('/filter/search', 'h');
      vi.advanceTimersByTime(50);
      store.set('/filter/search', 'he');
      vi.advanceTimersByTime(50);
      store.set('/filter/search', 'hel');
      vi.advanceTimersByTime(50);
      store.set('/filter/search', 'hell');
      vi.advanceTimersByTime(50);
      store.set('/filter/search', 'hello');

      // Not yet — debounce hasn't elapsed since last change
      await vi.advanceTimersByTimeAsync(200);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Now debounce elapses
      await vi.advanceTimersByTimeAsync(150);
      expect(fetcher).toHaveBeenCalledTimes(2); // only 1 extra fetch, not 5
    });
  });

  // ─── emptyWhileLoading ───

  describe('emptyWhileLoading', () => {
    it('preserves previous data while loading when emptyWhileLoading is false (default)', async () => {
      store = createStateStore({ filter: { page: 1 } });
      resolver = createTestResolver(store);

      let fetchCount = 0;
      let resolveFetch!: (v: unknown) => void;
      const fetcher = vi.fn().mockImplementation(() => {
        fetchCount++;
        if (fetchCount === 1) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([{ id: 1 }]),
          });
        }
        return new Promise((r) => { resolveFetch = r; });
      });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          items: {
            url: 'https://api.example.com/items',
            target: '/items',
            trigger: 'auto',
            emptyWhileLoading: false,
            params: { page: { $state: '/filter/page' } },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(store.get('/items')).toEqual([{ id: 1 }]);

      // Trigger re-fetch
      store.set('/filter/page', 2);
      await vi.runAllTimersAsync();

      // During loading — previous data should still be there
      expect(store.get('/items')).toEqual([{ id: 1 }]);
      expect(store.get('/itemsLoading')).toBe(true);

      // Resolve second fetch
      resolveFetch({ ok: true, status: 200, json: () => Promise.resolve([{ id: 2 }]) });
      await vi.runAllTimersAsync();

      expect(store.get('/items')).toEqual([{ id: 2 }]);
    });

    it('clears data while loading when emptyWhileLoading is true', async () => {
      store = createStateStore({ filter: { page: 1 } });
      resolver = createTestResolver(store);

      let fetchCount = 0;
      let resolveFetch!: (v: unknown) => void;
      const fetcher = vi.fn().mockImplementation(() => {
        fetchCount++;
        if (fetchCount === 1) {
          return Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve([{ id: 1 }]),
          });
        }
        return new Promise((r) => { resolveFetch = r; });
      });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          items: {
            url: 'https://api.example.com/items',
            target: '/items',
            trigger: 'auto',
            emptyWhileLoading: true,
            params: { page: { $state: '/filter/page' } },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(store.get('/items')).toEqual([{ id: 1 }]);

      // Trigger re-fetch
      store.set('/filter/page', 2);
      await vi.runAllTimersAsync();

      // During loading — data should be cleared
      expect(store.get('/items')).toBeNull();
      expect(store.get('/itemsLoading')).toBe(true);

      resolveFetch({ ok: true, status: 200, json: () => Promise.resolve([{ id: 2 }]) });
      await vi.runAllTimersAsync();

      expect(store.get('/items')).toEqual([{ id: 2 }]);
    });
  });

  // ─── Param serialization ───

  describe('param serialization', () => {
    it('appends resolved params as query string to URL', async () => {
      store = createStateStore({ filter: { status: 'active', page: 2 } });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
            params: {
              status: { $state: '/filter/status' },
              page: { $state: '/filter/page' },
            },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      const calledUrl = fetcher.mock.calls[0][0] as string;
      expect(calledUrl).toContain('status=active');
      expect(calledUrl).toContain('page=2');
    });

    it('omits params with null, undefined, empty string, or "all" values', async () => {
      store = createStateStore({
        filter: { status: null, search: '', category: 'all', page: 1 },
      });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
            params: {
              status: { $state: '/filter/status' },
              search: { $state: '/filter/search' },
              category: { $state: '/filter/category' },
              page: { $state: '/filter/page' },
            },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      const calledUrl = fetcher.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).not.toContain('status');
      expect(calledUrl).not.toContain('search');
      expect(calledUrl).not.toContain('category');
    });
  });

  // ─── Headers from state ───

  describe('headers from state', () => {
    it('resolves headers from state expressions', async () => {
      store = createStateStore({
        config: {
          headers: {
            Authorization: 'Bearer token123',
            apikey: 'key456',
          },
        },
      });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
            headers: { $state: '/config/headers' },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      const calledOptions = fetcher.mock.calls[0][1] as RequestInit;
      expect(calledOptions.headers).toEqual({
        Authorization: 'Bearer token123',
        apikey: 'key456',
      });
    });
  });

  // ─── URL expressions ───

  describe('URL resolution', () => {
    it('resolves URL from $template expression', async () => {
      store = createStateStore({ config: { apiUrl: 'https://api.example.com' } });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: { $template: '${/config/apiUrl}/tasks' },
            target: '/tasks',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      const calledUrl = fetcher.mock.calls[0][0] as string;
      expect(calledUrl).toContain('https://api.example.com/tasks');
    });
  });

  // ─── refreshDataSource ───

  describe('refreshDataSource', () => {
    it('forces re-fetch of a specific dataSource', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([{ id: 1 }]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(1);

      await engine.refresh('tasks');
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('throws on unknown dataSource id', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher: mockFetcher(),
        dataSources: {},
      });

      engine.mount();

      await expect(engine.refresh('nonexistent')).rejects.toThrow('Unknown dataSource: "nonexistent"');
    });
  });

  // ─── HTTP method ───

  describe('HTTP method', () => {
    it('defaults to GET', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          data: {
            url: 'https://api.example.com/data',
            target: '/data',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      const calledOptions = fetcher.mock.calls[0][1] as RequestInit;
      expect(calledOptions.method).toBe('GET');
    });

    it('uses specified method', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          data: {
            url: 'https://api.example.com/data',
            target: '/data',
            method: 'POST',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      const calledOptions = fetcher.mock.calls[0][1] as RequestInit;
      expect(calledOptions.method).toBe('POST');
    });
  });

  // ─── Unmount cleanup ───

  describe('unmount', () => {
    it('stops reacting to state changes after unmount', async () => {
      store = createStateStore({ filter: { page: 1 } });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          items: {
            url: 'https://api.example.com/items',
            target: '/items',
            trigger: 'auto',
            params: { page: { $state: '/filter/page' } },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(1);

      engine.unmount();

      store.set('/filter/page', 2);
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(1); // no re-fetch after unmount
    });
  });

  // ─── Multiple dataSources ───

  describe('multiple dataSources', () => {
    it('fetches multiple dataSources independently on mount', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);

      let callCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        callCount++;
        const data = callCount === 1 ? [{ id: 1 }] : { name: 'catalog' };
        return Promise.resolve({
          ok: true, status: 200,
          json: () => Promise.resolve(data),
        });
      });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
          },
          catalogs: {
            url: 'https://api.example.com/catalogs',
            target: '/catalogs',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(store.get('/tasks')).toBeDefined();
      expect(store.get('/catalogs')).toBeDefined();
    });

    it('only re-fetches the dataSource whose params changed', async () => {
      store = createStateStore({ filter: { status: 'active' }, pagination: { page: 1 } });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
            trigger: 'auto',
            params: { status: { $state: '/filter/status' } },
          },
          logs: {
            url: 'https://api.example.com/logs',
            target: '/logs',
            trigger: 'auto',
            params: { page: { $state: '/pagination/page' } },
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(2); // both initial

      // Change only tasks param
      store.set('/filter/status', 'completed');
      await vi.runAllTimersAsync();

      // Only tasks should re-fetch (total: 3, not 4)
      expect(fetcher).toHaveBeenCalledTimes(3);
    });
  });

  // ─── getActionDefinition for dispatcher integration ───

  describe('getActionDefinition', () => {
    it('returns an ActionDefinition that dispatches refresh by id', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([{ id: 1 }]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: 'https://api.example.com/tasks',
            target: '/tasks',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(1);

      const actionDef = engine.getActionDefinition();
      expect(actionDef.name).toBe('refreshDataSource');

      // Simulate dispatcher calling the action handler
      await actionDef.handler(
        { id: 'tasks' },
        store.set.bind(store),
        store.get.bind(store),
      );
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  // ─── URL with params also listens to URL deps ───

  describe('URL dependency tracking', () => {
    it('re-fetches when URL expression dependencies change', async () => {
      store = createStateStore({ config: { apiUrl: 'https://v1.example.com' } });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher([]);

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          tasks: {
            url: { $template: '${/config/apiUrl}/tasks' },
            target: '/tasks',
            trigger: 'auto',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(1);

      store.set('/config/apiUrl', 'https://v2.example.com');
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(2);
      const secondUrl = fetcher.mock.calls[1][0] as string;
      expect(secondUrl).toContain('https://v2.example.com/tasks');
    });
  });

  // ─── v49 Item E: skip-on-undefined-URL-deps + deferred state + unmount-safe refresh ───

  describe('DataSourcesEngine — v49 Item E: skip-on-undefined-URL-deps', () => {
    it('skips initial fetch when URL template dep is undefined', async () => {
      store = createStateStore({ auth: {} });  // /auth/userId NOT set
      resolver = createTestResolver(store);
      const fetcher = mockFetcher({ data: [] });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          posts: {
            url: { $template: '/api/users/${/auth/userId}/posts' },
            target: '/posts',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      expect(fetcher).not.toHaveBeenCalled();
      expect(store.get('/postsDeferred')).toBe(true);
      expect(store.get('/postsLoading')).toBe(false);
    });

    it('fires fetch when URL template dep resolves later (reactive subscription)', async () => {
      store = createStateStore({ auth: {} });
      resolver = createTestResolver(store);
      const fetcher = mockFetcher({ data: ['p1'] });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          posts: {
            url: { $template: '/api/users/${/auth/userId}/posts' },
            target: '/posts',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).not.toHaveBeenCalled();

      store.set('/auth/userId', 'u123');
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0][0]).toBe('/api/users/u123/posts');
      expect(store.get('/postsDeferred')).toBe(false);
    });

    it('fires fetch immediately when URL has no template deps', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher({ data: [] });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          posts: { url: '/api/posts', target: '/posts' },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(store.get('/postsDeferred')).toBe(false);
    });

    it('params deps undefined do NOT trigger skip (only URL template deps do)', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher({ data: [] });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          posts: {
            url: '/api/posts',
            params: { filter: { $state: '/ui/filter' } },
            target: '/posts',
          },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();

      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(fetcher.mock.calls[0][0]).toBe('/api/posts');
    });

    it('refresh() after unmount is a no-op (does not fire stale fetch)', async () => {
      store = createStateStore({});
      resolver = createTestResolver(store);
      const fetcher = mockFetcher({ data: [] });

      const engine = createDataSourcesEngine({
        store,
        resolver,
        fetcher,
        dataSources: {
          posts: { url: '/api/posts', target: '/posts' },
        },
      });

      engine.mount();
      await vi.runAllTimersAsync();
      expect(fetcher).toHaveBeenCalledTimes(1);

      engine.unmount();
      await engine.refresh('posts');

      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });
});
