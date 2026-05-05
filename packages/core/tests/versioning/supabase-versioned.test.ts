import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SupabaseVersionedSpecStore, SupabaseEnvironmentStore } from '../../src/spec-stores/supabase-versioned.js';

function createMockFetch(responses: Array<{ status: number; body: unknown }>) {
  let callIndex = 0;
  const fn = vi.fn(async () => {
    const resp = responses[callIndex] ?? { status: 200, body: [] };
    callIndex++;
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      statusText: resp.status === 200 || resp.status === 201 ? 'OK' : 'Error',
      json: async () => resp.body,
    } as Response;
  });
  return fn;
}

describe('SupabaseVersionedSpecStore', () => {
  const baseConfig = { url: 'https://test.supabase.co', apiKey: 'test-key' };
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('saveVersion creates v1 as snapshot', async () => {
    const mockFetch = createMockFetch([
      // 1. currentVersion query — no versions exist
      { status: 200, body: [] },
      // 2. load existing spec — none
      { status: 200, body: [] },
      // 3. POST snapshot v1
      { status: 201, body: {} },
      // 4. save base spec (PATCH)
      { status: 200, body: {} },
    ]);
    globalThis.fetch = mockFetch;

    const store = new SupabaseVersionedSpecStore(baseConfig);
    const spec = { root: 'page', elements: { page: { type: 'box' } } };
    const version = await store.saveVersion('s1', spec, { author: 'alice', source: 'push' });

    expect(version).toBe(1);
    // Verify POST to versions table included spec (snapshot)
    const postCall = mockFetch.mock.calls[2];
    const postBody = JSON.parse(postCall[1].body as string);
    expect(postBody.is_snapshot).toBe(true);
    expect(postBody.spec).toEqual(spec);
    expect(postBody.author).toBe('alice');
    expect(postBody.source_type).toBe('push');
  });

  it('currentVersion returns 0 for unknown spec', async () => {
    globalThis.fetch = createMockFetch([
      { status: 200, body: [] },
    ]);

    const store = new SupabaseVersionedSpecStore(baseConfig);
    expect(await store.currentVersion('unknown')).toBe(0);
  });

  it('currentVersion returns latest version number', async () => {
    globalThis.fetch = createMockFetch([
      { status: 200, body: [{ version: 5 }] },
    ]);

    const store = new SupabaseVersionedSpecStore(baseConfig);
    expect(await store.currentVersion('s1')).toBe(5);
  });

  it('saveVersion creates v2 with patches', async () => {
    const spec1 = { root: 'page', elements: { page: { type: 'box' } } };
    const spec2 = { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable' } } };

    const mockFetch = createMockFetch([
      // saveVersion v1: currentVersion → 0
      { status: 200, body: [] },
      // saveVersion v1: load existing → none
      { status: 200, body: [] },
      // saveVersion v1: POST snapshot
      { status: 201, body: {} },
      // saveVersion v1: save base
      { status: 200, body: {} },
      // saveVersion v2: currentVersion → 1
      { status: 200, body: [{ version: 1 }] },
      // saveVersion v2: loadVersion(1) — get snapshot
      { status: 200, body: [{ version: 1, spec: spec1 }] },
      // saveVersion v2: loadVersion(1) — no patches after snapshot (snapshot === target)
      // (skipped because snapshotVersion === version, returns early)
      // saveVersion v2: POST patches
      { status: 201, body: {} },
      // saveVersion v2: save base
      { status: 200, body: {} },
    ]);
    globalThis.fetch = mockFetch;

    const store = new SupabaseVersionedSpecStore(baseConfig);
    await store.saveVersion('s1', spec1, { author: 'alice', source: 'push' });
    const v2 = await store.saveVersion('s1', spec2, { author: 'bob', source: 'patch', description: 'Added button' });
    expect(v2).toBe(2);

    // Verify POST for v2 had patches, not spec
    const v2PostCall = mockFetch.mock.calls[6];
    const v2Body = JSON.parse(v2PostCall[1].body as string);
    expect(v2Body.is_snapshot).toBe(false);
    expect(v2Body.patches).toBeDefined();
    expect(v2Body.spec).toBeUndefined();
  });

  it('loadVersion reconstructs from snapshot + patches', async () => {
    const spec1 = { root: 'page', elements: { page: { type: 'box' } } };
    const patches12 = [{ op: 'add', path: '/elements/btn', value: { type: 'touchable' } }];

    const mockFetch = createMockFetch([
      // loadVersion: get nearest snapshot
      { status: 200, body: [{ version: 1, spec: spec1 }] },
      // loadVersion: get patches from 2 to 2
      { status: 200, body: [{ version: 2, patches: patches12 }] },
    ]);
    globalThis.fetch = mockFetch;

    const store = new SupabaseVersionedSpecStore(baseConfig);
    const result = await store.loadVersion('s1', 2);
    expect(result).toEqual({ root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable' } } });
  });

  it('loadVersion returns snapshot directly when version matches', async () => {
    const spec1 = { root: 'page', elements: { page: { type: 'box' } } };

    globalThis.fetch = createMockFetch([
      { status: 200, body: [{ version: 1, spec: spec1 }] },
    ]);

    const store = new SupabaseVersionedSpecStore(baseConfig);
    const result = await store.loadVersion('s1', 1);
    expect(result).toEqual(spec1);
  });

  it('listVersions returns entries in desc order with limit', async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: [
        { version: 3, created_at: '2026-04-10T10:00:00Z', author: 'c', source_type: 'patch', description: null, is_snapshot: false },
        { version: 2, created_at: '2026-04-10T09:00:00Z', author: 'b', source_type: 'patch', description: 'Added btn', is_snapshot: false },
      ] },
    ]);
    globalThis.fetch = mockFetch;

    const store = new SupabaseVersionedSpecStore(baseConfig);
    const entries = await store.listVersions('s1', 2);
    expect(entries).toHaveLength(2);
    expect(entries[0].version).toBe(3);
    expect(entries[1].version).toBe(2);
    expect(entries[1].description).toBe('Added btn');

    // Verify URL has limit and order
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('limit=2');
    expect(url).toContain('order=version.desc');
  });

  it('lazy bootstrap — saveVersion on existing spec creates v1 from current', async () => {
    const existingSpec = { old: true };
    const newSpec = { old: true, new: true };

    const mockFetch = createMockFetch([
      // currentVersion → 0
      { status: 200, body: [] },
      // load existing spec → found
      { status: 200, body: [{ spec: existingSpec }] },
      // POST bootstrap v1
      { status: 201, body: {} },
      // loadVersion(1): snapshot query (for computing patches for v2)
      { status: 200, body: [{ version: 1, spec: existingSpec }] },
      // POST v2 with patches
      { status: 201, body: {} },
      // save base
      { status: 200, body: {} },
    ]);
    globalThis.fetch = mockFetch;

    const store = new SupabaseVersionedSpecStore(baseConfig);
    const version = await store.saveVersion('s1', newSpec, { author: 'a', source: 'push' });
    expect(version).toBe(2);

    // v1 bootstrap POST should have the existing spec
    const bootstrapCall = mockFetch.mock.calls[2];
    const bootstrapBody = JSON.parse(bootstrapCall[1].body as string);
    expect(bootstrapBody.version).toBe(1);
    expect(bootstrapBody.spec).toEqual(existingSpec);
    expect(bootstrapBody.author).toBe('system');
  });
});

describe('SupabaseEnvironmentStore', () => {
  const envConfig = { url: 'https://test.supabase.co', apiKey: 'test-key' };
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('setEnvironment creates pointer via upsert', async () => {
    const mockFetch = createMockFetch([
      { status: 201, body: {} },
    ]);
    globalThis.fetch = mockFetch;

    const envStore = new SupabaseEnvironmentStore(envConfig);
    await envStore.setEnvironment('s1', 'dev', 5, 'alice');

    const postCall = mockFetch.mock.calls[0];
    expect(postCall[1].method).toBe('POST');
    const body = JSON.parse(postCall[1].body as string);
    expect(body.screen_id).toBe('s1');
    expect(body.environment).toBe('dev');
    expect(body.version).toBe(5);
    expect(body.promoted_by).toBe('alice');
    // Verify upsert header
    const headers = postCall[1].headers as Record<string, string>;
    expect(headers.Prefer).toContain('resolution=merge-duplicates');
  });

  it('getEnvironments returns all pointers for a spec', async () => {
    globalThis.fetch = createMockFetch([
      { status: 200, body: [
        { environment: 'dev', version: 5, promoted_at: '2026-04-10T10:00:00Z', promoted_by: 'a' },
        { environment: 'prod', version: 3, promoted_at: '2026-04-10T09:00:00Z', promoted_by: 'b' },
      ] },
    ]);

    const envStore = new SupabaseEnvironmentStore(envConfig);
    const envs = await envStore.getEnvironments('s1');
    expect(envs).toHaveLength(2);
    expect(envs[0].name).toBe('dev');
    expect(envs[0].version).toBe(5);
    expect(envs[1].name).toBe('prod');
  });

  it('getEnvironment returns null for unknown', async () => {
    globalThis.fetch = createMockFetch([
      { status: 200, body: [] },
    ]);

    const envStore = new SupabaseEnvironmentStore(envConfig);
    expect(await envStore.getEnvironment('s1', 'dev')).toBeNull();
  });

  it('getEnvironment returns pointer when found', async () => {
    globalThis.fetch = createMockFetch([
      { status: 200, body: [
        { environment: 'prod', version: 7, promoted_at: '2026-04-10T12:00:00Z', promoted_by: 'bob' },
      ] },
    ]);

    const envStore = new SupabaseEnvironmentStore(envConfig);
    const env = await envStore.getEnvironment('s1', 'prod');
    expect(env).not.toBeNull();
    expect(env!.name).toBe('prod');
    expect(env!.version).toBe(7);
    expect(env!.promotedBy).toBe('bob');
  });
});
