import { describe, it, expect, vi } from 'vitest';
import { createStateStore } from '../../src/state/store.js';
import { createResolver } from '../../src/expressions/resolver.js';
import { createActionDispatcher } from '../../src/actions/dispatcher.js';
import { createProtectionRegistry } from '../../src/security/protection-registry.js';
import { createStateGuard } from '../../src/security/state-protection.js';
import { mountSpecRuntime } from '../../src/runtime/mount-spec-runtime.js';
import type { Spec } from '../../src/types.js';

function createTestDeps(extraInitialState: Record<string, unknown> = {}) {
  const store = createStateStore(extraInitialState);
  const resolver = createResolver({ store });
  const protectionRegistry = createProtectionRegistry();
  const stateGuard = createStateGuard(() => protectionRegistry.allPaths());
  const dispatcher = createActionDispatcher({ store, stateGuard });
  return { store, resolver, dispatcher, protectionRegistry, stateGuard };
}

describe('mountSpecRuntime', () => {
  it('returns no-op runtime when spec has neither derive nor dataSources', () => {
    const deps = createTestDeps();
    const spec: Spec = { root: 'root', elements: { root: { type: 'box' } } };
    const runtime = mountSpecRuntime(spec, deps);
    expect(typeof runtime.unmount).toBe('function');
    expect(() => runtime.unmount()).not.toThrow();
  });

  it('mounts derive engine and populates derive paths from initial state', () => {
    const deps = createTestDeps({ count: 5 });
    const spec: Spec = {
      root: 'root',
      elements: { root: { type: 'box' } },
      derive: { '/doubled': { $state: '/count' } },
    };
    const runtime = mountSpecRuntime(spec, deps);
    expect(deps.store.get('/doubled')).toBe(5);
    runtime.unmount();
  });

  it('contributes derive paths to protection registry; releases on unmount', () => {
    const deps = createTestDeps();
    const spec: Spec = {
      root: 'root',
      elements: { root: { type: 'box' } },
      derive: { '/derived/foo': 1, '/derived/bar': 2 },
    };
    expect(deps.stateGuard.canWrite('/derived/foo')).toBe(true);

    const runtime = mountSpecRuntime(spec, deps);
    expect(deps.stateGuard.canWrite('/derived/foo')).toBe(false);
    expect(deps.stateGuard.canWrite('/derived/bar')).toBe(false);

    runtime.unmount();
    expect(deps.stateGuard.canWrite('/derived/foo')).toBe(true);
    expect(deps.stateGuard.canWrite('/derived/bar')).toBe(true);
  });

  it('registers refreshDataSource action when spec has dataSources', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) });
    const deps = createTestDeps();
    const spec: Spec = {
      root: 'root',
      elements: { root: { type: 'box' } },
      dataSources: { posts: { url: '/api/posts', target: '/posts' } },
    };
    const runtime = mountSpecRuntime(spec, { ...deps, fetcher });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetcher).toHaveBeenCalledTimes(1);

    await deps.dispatcher.dispatch(
      { action: 'refreshDataSource', params: { id: 'posts' } },
      (v) => v,
    );
    expect(fetcher).toHaveBeenCalledTimes(2);

    runtime.unmount();
  });

  it('registers editor session actions when spec has editorSessions', async () => {
    const deps = createTestDeps({
      layout: { items: [{ id: 'item-1', label: 'A' }] },
      ui: { spatialItemChange: { itemId: 'item-1', nextItem: { id: 'item-1', label: 'B' } } },
    });
    const spec: Spec = {
      root: 'root',
      elements: { root: { type: 'box' } },
      editorSessions: { editor: { paths: ['/layout/items'] } },
    };

    const runtime = mountSpecRuntime(spec, deps);

    await deps.dispatcher.dispatch({
      action: 'editorCommit',
      params: {
        session: 'editor',
        changes: [
          {
            path: '/layout/items',
            value: {
              $array: 'replace',
              source: { $state: '/layout/items' },
              where: { field: 'id', eq: { $state: '/ui/spatialItemChange/itemId' } },
              value: { $state: '/ui/spatialItemChange/nextItem' },
            },
          },
        ],
      },
    }, (expr) => deps.resolver.resolve(expr));

    expect(deps.store.get('/layout/items')).toEqual([{ id: 'item-1', label: 'B' }]);
    expect(deps.store.get('/ui/editorSessions/editor/canUndo')).toBe(true);

    await deps.dispatcher.dispatch({ action: 'editorUndo', params: { session: 'editor' } }, (expr) => deps.resolver.resolve(expr));
    expect(deps.store.get('/layout/items')).toEqual([{ id: 'item-1', label: 'A' }]);

    runtime.unmount();
  });

  it('exposes mounted editor session engine on the spec runtime', () => {
    const deps = createTestDeps({ layout: { items: [] } });
    const runtime = mountSpecRuntime({
      root: 'root',
      elements: { root: { type: 'box' } },
      editorSessions: { editor: { paths: ['/layout/items'] } },
    }, deps);

    expect(runtime.editorSessionEngine).toBeTruthy();
    expect(typeof runtime.editorSessionEngine?.discard).toBe('function');

    runtime.unmount();
  });

  it('registers editorSave with fetcher, resolver, and urlGuard wiring', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
    const assertAllowed = vi.fn();
    const deps = createTestDeps({
      layout: { items: [{ id: 'item-1', label: 'A' }] },
      ui: { saveUrl: '/api/layout' },
    });
    const spec: Spec = {
      root: 'root',
      elements: { root: { type: 'box' } },
      editorSessions: {
        editor: {
          paths: ['/layout/items'],
          persistence: { url: { $state: '/ui/saveUrl' }, method: 'PUT' },
        },
      },
    };

    const runtime = mountSpecRuntime(spec, {
      ...deps,
      fetcher,
      urlGuard: { isAllowed: () => true, assertAllowed },
    });

    await deps.dispatcher.dispatch({
      action: 'editorCommit',
      params: {
        session: 'editor',
        changes: [{ path: '/layout/items', value: [{ id: 'item-2', label: 'B' }] }],
      },
    }, (expr) => deps.resolver.resolve(expr));
    await deps.dispatcher.dispatch({ action: 'editorSave', params: { session: 'editor' } }, (expr) => deps.resolver.resolve(expr));

    expect(assertAllowed).toHaveBeenCalledWith('/api/layout');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(deps.store.get('/ui/editorSessions/editor/saveStatus')).toBe('saved');
    expect(deps.store.get('/ui/editorSessions/editor/dirty')).toBe(false);

    runtime.unmount();
  });

  it('protects editor session metadata while runtime is mounted and releases on unmount', () => {
    const deps = createTestDeps({ layout: { items: [] } });
    const spec: Spec = {
      root: 'root',
      elements: { root: { type: 'box' } },
      editorSessions: { editor: { paths: ['/layout/items'] } },
    };

    expect(deps.stateGuard.canWrite('/ui/editorSessions/editor/dirty')).toBe(true);
    const runtime = mountSpecRuntime(spec, deps);
    expect(deps.stateGuard.canWrite('/ui/editorSessions/editor/dirty')).toBe(false);
    runtime.unmount();
    expect(deps.stateGuard.canWrite('/ui/editorSessions/editor/dirty')).toBe(true);
  });

  it('cleans editor session metadata on unmount', () => {
    const deps = createTestDeps({ layout: { items: [] } });
    const runtime = mountSpecRuntime({
      root: 'root',
      elements: { root: { type: 'box' } },
      editorSessions: { editor: { paths: ['/layout/items'] } },
    }, deps);
    expect(deps.store.get('/ui/editorSessions/editor')).toBeTruthy();
    runtime.unmount();
    expect(deps.store.get('/ui/editorSessions/editor')).toBeUndefined();
  });

  it('re-mount after unmount works (no stale state)', () => {
    const deps = createTestDeps({ count: 5 });
    const spec: Spec = {
      root: 'root',
      elements: { root: { type: 'box' } },
      derive: { '/doubled': { $state: '/count' } },
    };
    const runtime1 = mountSpecRuntime(spec, deps);
    expect(deps.store.get('/doubled')).toBe(5);
    runtime1.unmount();
    expect(deps.stateGuard.canWrite('/doubled')).toBe(true);

    deps.store.set('/count', 7);
    const runtime2 = mountSpecRuntime(spec, deps);
    expect(deps.store.get('/doubled')).toBe(7);
    expect(deps.stateGuard.canWrite('/doubled')).toBe(false);

    runtime2.unmount();
  });

  it('chained derives cascade via subscription without infinite loop', () => {
    const deps = createTestDeps({ input: 1 });
    const spec: Spec = {
      root: 'root',
      elements: { root: { type: 'box' } },
      derive: {
        '/computed/a': { $state: '/input' },
        '/computed/b': { $state: '/computed/a' },
      },
    };
    const runtime = mountSpecRuntime(spec, deps);
    expect(deps.store.get('/computed/a')).toBe(1);
    expect(deps.store.get('/computed/b')).toBe(1);

    deps.store.set('/input', 5);
    expect(deps.store.get('/computed/a')).toBe(5);
    expect(deps.store.get('/computed/b')).toBe(5);

    runtime.unmount();
  });
});
