import { describe, expect, it, vi } from 'vitest';
import { createStateStore } from '../../src/state/store.js';
import { createEditorSessionEngine } from '../../src/editor-session/engine.js';

function createEngine() {
  const store = createStateStore({
    layout: {
      items: [{ id: 'item-1', label: 'A', position: { x: 10, y: 20 } }],
      zones: [{ id: 'zone-1', label: 'Main' }],
    },
  });
  const engine = createEditorSessionEngine({
    store,
    sessions: {
      'floor-layout': {
        paths: ['/layout/items', '/layout/zones'],
        maxHistory: 3,
        label: 'Floor layout',
        validators: [
          { type: 'pathExists', path: '/layout/items' },
          { type: 'arrayObjects', path: '/layout/items' },
          { type: 'arrayUniqueField', path: '/layout/items', field: 'id' },
          { type: 'arrayUniqueField', path: '/layout/zones', field: 'id' },
          { type: 'jsonSerializable', path: '/layout' },
        ],
      },
    },
  });
  return { store, engine };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function jsonResponse(data: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createPersistenceEngine(options: {
  fetcher?: (url: string, options?: RequestInit) => Promise<Response>;
  persistence?: Record<string, unknown>;
  paths?: string[];
} = {}) {
  const store = createStateStore({
    ui: {
      saveUrl: '/api/layout',
      token: 'session-token',
    },
    layout: {
      items: [{ id: 'item-1', label: 'A', position: { x: 10, y: 20 } }],
      zones: [{ id: 'zone-1', label: 'Main' }],
    },
  });
  const fetcher = options.fetcher ?? vi.fn(async () => jsonResponse({ ok: true }));
  const assertAllowed = vi.fn();
  const engine = createEditorSessionEngine({
    store,
    now: () => '2026-05-04T00:00:00.000Z',
    resolve: (expr: unknown) => {
      if (expr && typeof expr === 'object' && '$state' in expr) {
        return store.get(String((expr as Record<string, unknown>).$state));
      }
      return expr;
    },
    fetcher,
    urlGuard: { isAllowed: () => true, assertAllowed },
    sessions: {
      'floor-layout': {
        paths: options.paths ?? ['/layout/items', '/layout/zones'],
        persistence: {
          url: '/api/layout',
          method: 'PUT',
          headers: { 'x-session': 'floor' },
          ...(options.persistence ?? {}),
        },
      },
    },
  });
  return { store, engine, fetcher, assertAllowed };
}

describe('EditorSessionEngine', () => {
  it('mounts metadata from the initial saved snapshot', () => {
    const { store } = createEngine();
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(false);
    expect(store.get('/ui/editorSessions/floor-layout/canUndo')).toBe(false);
    expect(store.get('/ui/editorSessions/floor-layout/undoDepth')).toBe(0);
  });

  it('commits one path and marks the session dirty', () => {
    const { store, engine } = createEngine();
    engine.commit({
      session: 'floor-layout',
      label: 'Move item',
      changes: [{ path: '/layout/items', value: [{ id: 'item-1', label: 'A', position: { x: 50, y: 60 } }] }],
    });

    expect(store.get('/layout/items')).toEqual([{ id: 'item-1', label: 'A', position: { x: 50, y: 60 } }]);
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(true);
    expect(store.get('/ui/editorSessions/floor-layout/canUndo')).toBe(true);
    expect(store.get('/ui/editorSessions/floor-layout/lastCommitLabel')).toBe('Move item');
  });

  it('treats multi-path commits as one undoable entry', () => {
    const { store, engine } = createEngine();
    engine.commit({
      session: 'floor-layout',
      label: 'Replace layout',
      changes: [
        { path: '/layout/items', value: [{ id: 'item-2', label: 'B' }] },
        { path: '/layout/zones', value: [{ id: 'zone-2', label: 'Patio' }] },
      ],
    });

    expect(store.get('/ui/editorSessions/floor-layout/undoDepth')).toBe(1);
    expect(engine.undo('floor-layout')).toBe(true);
    expect(store.get('/layout/items')).toEqual([{ id: 'item-1', label: 'A', position: { x: 10, y: 20 } }]);
    expect(store.get('/layout/zones')).toEqual([{ id: 'zone-1', label: 'Main' }]);
  });

  it('undo and redo update dirty using saved fingerprint equality', () => {
    const { store, engine } = createEngine();
    const savedItems = store.get('/layout/items');
    const movedItems = [{ id: 'item-1', label: 'A', position: { x: 50, y: 60 } }];

    engine.commit({ session: 'floor-layout', changes: [{ path: '/layout/items', value: movedItems }] });
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(true);

    engine.undo('floor-layout');
    expect(store.get('/layout/items')).toEqual(savedItems);
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(false);

    engine.redo('floor-layout');
    expect(store.get('/layout/items')).toEqual(movedItems);
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(true);
  });

  it('markSaved clears dirty but preserves undo history', () => {
    const { store, engine } = createEngine();
    engine.commit({ session: 'floor-layout', changes: [{ path: '/layout/items', value: [{ id: 'item-2' }] }] });
    engine.markSaved('floor-layout', '2026-05-04T00:00:00.000Z');

    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(false);
    expect(store.get('/ui/editorSessions/floor-layout/canUndo')).toBe(true);

    engine.undo('floor-layout');
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(true);
  });

  it('discard restores saved snapshot and clears history', () => {
    const { store, engine } = createEngine();
    engine.commit({ session: 'floor-layout', changes: [{ path: '/layout/items', value: [{ id: 'item-2' }] }] });
    engine.markSaved('floor-layout');
    engine.commit({ session: 'floor-layout', changes: [{ path: '/layout/items', value: [{ id: 'item-3' }] }] });

    engine.discard('floor-layout');
    expect(store.get('/layout/items')).toEqual([{ id: 'item-2' }]);
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(false);
    expect(store.get('/ui/editorSessions/floor-layout/canUndo')).toBe(false);
    expect(store.get('/ui/editorSessions/floor-layout/canRedo')).toBe(false);
    expect(store.get('/ui/editorSessions/floor-layout/lastCommitLabel')).toBeNull();
  });

  it('rejects commits outside tracked paths', () => {
    const { engine } = createEngine();
    expect(() => engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/ui/selectedSpatialItem', value: { itemId: 'item-1' } }],
    })).toThrow('outside tracked editor session paths');
  });

  it('does not push history for semantic no-op commits', () => {
    const { store, engine } = createEngine();
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-1', label: 'A', position: { x: 10, y: 20 } }] }],
    });
    expect(store.get('/ui/editorSessions/floor-layout/undoDepth')).toBe(0);
  });

  it('keeps dirty true when a semantic no-op commit happens after unsaved edits', () => {
    const { store, engine } = createEngine();
    const unsavedItems = [{ id: 'item-1', label: 'A', position: { x: 30, y: 40 } }];

    engine.commit({ session: 'floor-layout', changes: [{ path: '/layout/items', value: unsavedItems }] });
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(true);

    engine.commit({ session: 'floor-layout', changes: [{ path: '/layout/items', value: unsavedItems }] });
    expect(store.get('/ui/editorSessions/floor-layout/undoDepth')).toBe(1);
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(true);
  });

  it('refreshes lastCommitLabel after undo and redo', () => {
    const { store, engine } = createEngine();
    engine.commit({ session: 'floor-layout', label: 'First edit', changes: [{ path: '/layout/items', value: [{ id: 'item-2' }] }] });
    engine.commit({ session: 'floor-layout', label: 'Second edit', changes: [{ path: '/layout/items', value: [{ id: 'item-3' }] }] });

    expect(store.get('/ui/editorSessions/floor-layout/lastCommitLabel')).toBe('Second edit');
    engine.undo('floor-layout');
    expect(store.get('/ui/editorSessions/floor-layout/lastCommitLabel')).toBe('First edit');
    engine.undo('floor-layout');
    expect(store.get('/ui/editorSessions/floor-layout/lastCommitLabel')).toBeNull();
    engine.redo('floor-layout');
    expect(store.get('/ui/editorSessions/floor-layout/lastCommitLabel')).toBe('First edit');
  });

  it('trims undo history to maxHistory', () => {
    const { store, engine } = createEngine();
    for (let i = 0; i < 5; i++) {
      engine.commit({ session: 'floor-layout', changes: [{ path: '/layout/items', value: [{ id: `item-${i}` }] }] });
    }
    expect(store.get('/ui/editorSessions/floor-layout/undoDepth')).toBe(3);
  });

  it('clones captured values so later nested writes do not corrupt undo', () => {
    const { store, engine } = createEngine();
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-1', metadata: { capacity: 4 } }] }],
    });
    store.set('/layout/items/0/metadata/capacity', 99);
    engine.undo('floor-layout');
    expect(store.get('/layout/items/0/metadata/capacity')).toBeUndefined();
  });

  it('validates duplicate ids and writes metadata', () => {
    const { store, engine } = createEngine();
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'dup' }, { id: 'dup' }] }],
    });

    const result = engine.validate('floor-layout');
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('duplicate');
    expect(store.get('/ui/editorSessions/floor-layout/validation/valid')).toBe(false);
  });

  it('validates missing paths, non-object array items, and non-json values', () => {
    const { store, engine } = createEngine();

    store.set('/layout/items', [null]);
    let result = engine.validate('floor-layout');
    expect(result.errors.some((error) => error.code === 'array-objects')).toBe(true);

    store.set('/layout/items', undefined);
    result = engine.validate('floor-layout');
    expect(result.errors.some((error) => error.code === 'path-missing')).toBe(true);

    store.set('/layout/items', [{ id: 'item-1', run: () => null }]);
    result = engine.validate('floor-layout');
    expect(result.errors.some((error) => error.code === 'json-serializable')).toBe(true);
  });

  it('clears stale validation metadata after undo', () => {
    const { store, engine } = createEngine();
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'dup' }, { id: 'dup' }] }],
    });
    engine.validate('floor-layout');
    expect(store.get('/ui/editorSessions/floor-layout/validation/valid')).toBe(false);

    engine.undo('floor-layout');
    expect(store.get('/ui/editorSessions/floor-layout/validation/valid')).toBe(true);
    expect(store.get('/ui/editorSessions/floor-layout/validation/checkedAt')).toBeNull();
  });

  it('saves configured persistence and marks the sent snapshot clean', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true }));
    const { store, engine, assertAllowed } = createPersistenceEngine({ fetcher });
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-2', label: 'B' }] }],
    });

    await engine.save({ session: 'floor-layout' });

    expect(assertAllowed).toHaveBeenCalledWith('/api/layout');
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('/api/layout');
    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toEqual({
      layout: {
        items: [{ id: 'item-2', label: 'B' }],
        zones: [{ id: 'zone-1', label: 'Main' }],
      },
    });
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(false);
    expect(store.get('/ui/editorSessions/floor-layout/saveStatus')).toBe('saved');
    expect(store.get('/ui/editorSessions/floor-layout/lastSavedAt')).toBe('2026-05-04T00:00:00.000Z');
  });

  it('keeps dirty and exposes saveError when persistence fails', async () => {
    const { store, engine } = createPersistenceEngine({
      fetcher: vi.fn(async () => jsonResponse({ detail: 'no' }, { status: 500 })),
    });
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-2', label: 'B' }] }],
    });

    await engine.save({ session: 'floor-layout' });

    expect(store.get('/layout/items')).toEqual([{ id: 'item-2', label: 'B' }]);
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(true);
    expect(store.get('/ui/editorSessions/floor-layout/status')).toBe('error');
    expect(store.get('/ui/editorSessions/floor-layout/saveStatus')).toBe('error');
    expect(store.get('/ui/editorSessions/floor-layout/saveError')).toEqual({
      status: 500,
      message: 'HTTP 500',
      data: { detail: 'no' },
    });
  });

  it('does not let unrelated global lastError corrupt a successful save', async () => {
    const { store, engine } = createPersistenceEngine({
      fetcher: vi.fn(async () => {
        store.set('/ui/lastError', { message: 'unrelated data source failed' });
        return jsonResponse({ ok: true });
      }),
    });
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-2', label: 'B' }] }],
    });

    await engine.save({ session: 'floor-layout' });

    expect(store.get('/ui/lastError')).toEqual({ message: 'unrelated data source failed' });
    expect(store.get('/ui/editorSessions/floor-layout/saveStatus')).toBe('saved');
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(false);
  });

  it('keeps later edits dirty when save resolves after another commit', async () => {
    const deferred = createDeferred<Response>();
    const { store, engine } = createPersistenceEngine({
      fetcher: vi.fn(async () => deferred.promise),
    });
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-2', label: 'B' }] }],
    });

    const savePromise = engine.save({ session: 'floor-layout' });
    await Promise.resolve();
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-3', label: 'C' }] }],
    });
    deferred.resolve(jsonResponse({ ok: true }));
    await savePromise;

    expect(store.get('/layout/items')).toEqual([{ id: 'item-3', label: 'C' }]);
    expect(store.get('/ui/editorSessions/floor-layout/saveStatus')).toBe('saved');
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(true);
  });

  it('accounts for response targets inside tracked paths before marking clean', async () => {
    const { store, engine } = createPersistenceEngine({
      paths: ['/layout'],
      persistence: { target: '/layout/savedAt' },
      fetcher: vi.fn(async () => jsonResponse('saved-now')),
    });
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-2', label: 'B' }] }],
    });

    await engine.save({ session: 'floor-layout' });

    expect(store.get('/layout/savedAt')).toBe('saved-now');
    expect(store.get('/ui/editorSessions/floor-layout/dirty')).toBe(false);
  });

  it('de-duplicates concurrent saves for a session', async () => {
    const deferred = createDeferred<Response>();
    const fetcher = vi.fn(async () => deferred.promise);
    const { engine } = createPersistenceEngine({ fetcher });

    const first = engine.save({ session: 'floor-layout' });
    const second = engine.save({ session: 'floor-layout' });
    expect(fetcher).toHaveBeenCalledTimes(1);

    deferred.resolve(jsonResponse({ ok: true }));
    await Promise.all([first, second]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not recreate metadata after unmounting during a save', async () => {
    const deferred = createDeferred<Response>();
    const { store, engine } = createPersistenceEngine({
      fetcher: vi.fn(async () => deferred.promise),
    });
    const savePromise = engine.save({ session: 'floor-layout' });
    await Promise.resolve();

    engine.unmount();
    expect(store.get('/ui/editorSessions/floor-layout')).toBeUndefined();
    deferred.resolve(jsonResponse({ ok: true }));
    await savePromise;

    expect(store.get('/ui/editorSessions/floor-layout')).toBeUndefined();
  });

  it('resolves persistence expressions at save time', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ ok: true }));
    const { engine } = createPersistenceEngine({
      fetcher,
      persistence: {
        url: { $state: '/ui/saveUrl' },
        headers: { authorization: { $state: '/ui/token' } },
        body: { items: { $state: '/layout/items' }, source: 'editor' },
      },
    });

    await engine.save({ session: 'floor-layout' });

    expect(fetcher.mock.calls[0][0]).toBe('/api/layout');
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ authorization: 'session-token' });
    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toEqual({
      items: [{ id: 'item-1', label: 'A', position: { x: 10, y: 20 } }],
      source: 'editor',
    });
  });

  it('clears stale save errors after document edits', async () => {
    const { store, engine } = createPersistenceEngine({
      fetcher: vi.fn(async () => jsonResponse({ detail: 'no' }, { status: 500 })),
    });
    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-2', label: 'B' }] }],
    });
    await engine.save({ session: 'floor-layout' });
    expect(store.get('/ui/editorSessions/floor-layout/saveStatus')).toBe('error');

    engine.commit({
      session: 'floor-layout',
      changes: [{ path: '/layout/items', value: [{ id: 'item-3', label: 'C' }] }],
    });

    expect(store.get('/ui/editorSessions/floor-layout/saveStatus')).toBe('idle');
    expect(store.get('/ui/editorSessions/floor-layout/saveError')).toBeNull();
  });
});
