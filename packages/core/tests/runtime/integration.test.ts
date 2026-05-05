import { describe, it, expect, vi } from 'vitest';
import { createMythik } from '../../src/factory.js';
import { createActionDispatcher } from '../../src/actions/dispatcher.js';
import { mountSpecRuntime } from '../../src/runtime/mount-spec-runtime.js';
import type { Spec } from '../../src/types.js';

function setupTestEnv(initialState: Record<string, unknown> = {}, fetcher?: any) {
  const svc = createMythik({ initialState });
  const dispatcher = createActionDispatcher({
    store: svc.store,
    customActions: svc.plugins.getActions(),
    stateGuard: svc.security.stateGuard,
    fetcher,
  });
  return { svc, dispatcher };
}

describe('runtime integration — v49 Item E (audit § F10 scenarios)', () => {
  it('derive reactive recompute after state change', () => {
    const { svc, dispatcher } = setupTestEnv({ count: 5 });
    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      derive: { '/doubled': { $state: '/count' } },
    };
    const runtime = mountSpecRuntime(spec, {
      store: svc.store,
      resolver: svc.resolver,
      dispatcher,
      protectionRegistry: svc.protectionRegistry,
    });
    expect(svc.store.get('/doubled')).toBe(5);
    svc.store.set('/count', 7);
    expect(svc.store.get('/doubled')).toBe(7);
    runtime.unmount();
  });

  it('dataSources reactive re-fetch when filter changes', async () => {
    const fetcher = vi.fn().mockImplementation((url: string) => Promise.resolve({
      ok: true, status: 200, json: async () => ({ items: [url] }),
    }));
    const { svc, dispatcher } = setupTestEnv({ ui: { filter: 'all' } }, fetcher);
    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: {
        items: {
          url: '/api/items',
          params: { filter: { $state: '/ui/filter' } },
          target: '/items',
        },
      },
    };
    const runtime = mountSpecRuntime(spec, {
      store: svc.store, resolver: svc.resolver, dispatcher, protectionRegistry: svc.protectionRegistry, fetcher,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetcher).toHaveBeenCalledTimes(1);

    svc.store.set('/ui/filter', 'active');
    await new Promise((r) => setTimeout(r, 10));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][0]).toContain('filter=active');

    runtime.unmount();
  });

  it('refreshDataSource action manually triggers fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const { svc, dispatcher } = setupTestEnv({}, fetcher);
    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: { posts: { url: '/api/posts', target: '/posts' } },
    };
    const runtime = mountSpecRuntime(spec, {
      store: svc.store, resolver: svc.resolver, dispatcher, protectionRegistry: svc.protectionRegistry, fetcher,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetcher).toHaveBeenCalledTimes(1);

    await dispatcher.dispatch(
      { action: 'refreshDataSource', params: { id: 'posts' } },
      (v) => v,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
    runtime.unmount();
  });

  it('skip-on-undefined-URL-dep then reactive fetch when dep resolves', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const { svc, dispatcher } = setupTestEnv({ auth: {} }, fetcher);
    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: {
        posts: { url: { $template: '/api/users/${/auth/userId}/posts' }, target: '/posts' },
      },
    };
    const runtime = mountSpecRuntime(spec, {
      store: svc.store, resolver: svc.resolver, dispatcher, protectionRegistry: svc.protectionRegistry, fetcher,
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetcher).not.toHaveBeenCalled();
    expect(svc.store.get('/postsDeferred')).toBe(true);

    svc.store.set('/auth/userId', 'u123');
    await new Promise((r) => setTimeout(r, 10));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('/api/users/u123/posts');
    expect(svc.store.get('/postsDeferred')).toBe(false);

    runtime.unmount();
  });

  it('re-mount after unmount works (Gap 2 regression — no action-already-registered)', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    const { svc, dispatcher } = setupTestEnv({}, fetcher);
    const spec: Spec = {
      root: 'r',
      elements: { r: { type: 'box' } },
      dataSources: { posts: { url: '/api/posts', target: '/posts' } },
    };
    const r1 = mountSpecRuntime(spec, {
      store: svc.store, resolver: svc.resolver, dispatcher, protectionRegistry: svc.protectionRegistry, fetcher,
    });
    await new Promise((r) => setTimeout(r, 0));
    r1.unmount();

    expect(() => {
      const r2 = mountSpecRuntime(spec, {
        store: svc.store, resolver: svc.resolver, dispatcher, protectionRegistry: svc.protectionRegistry, fetcher,
      });
      r2.unmount();
    }).not.toThrow();
  });
});
