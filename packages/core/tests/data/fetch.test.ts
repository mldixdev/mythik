import { describe, it, expect, vi } from 'vitest';
import { createFetchEngine } from '../../src/data/fetch.js';
import { createStateStore } from '../../src/state/store.js';

describe('FetchEngine', () => {
  function mockFetcher(responseData: unknown, ok = true, status = 200) {
    return vi.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(responseData),
    });
  }

  function setup(state: Record<string, unknown> = {}, responseData: unknown = {}, ok = true) {
    const store = createStateStore(state);
    const fetcher = mockFetcher(responseData, ok, ok ? 200 : 500);
    const engine = createFetchEngine({ store, resolve: (e) => e, fetcher });
    return { store, engine, fetcher };
  }

  it('fetches data and stores it at the key path', async () => {
    const { store, engine } = setup({}, { name: 'Alice', age: 30 });
    await engine.execute('patient', { source: 'api/patients/1', on: 'mount' });
    expect(store.get('/patient')).toEqual({ name: 'Alice', age: 30 });
    expect(engine.getStatus('patient')).toBe('success');
  });

  it('sets loading status during fetch', async () => {
    const store = createStateStore({});
    let resolvePromise: (v: unknown) => void;
    const fetcher = vi.fn().mockReturnValue(new Promise((r) => { resolvePromise = r; }));
    const engine = createFetchEngine({ store, resolve: (e) => e, fetcher });

    const promise = engine.execute('data', { source: 'api/data', on: 'mount' });
    expect(engine.getStatus('data')).toBe('loading');

    resolvePromise!({ ok: true, status: 200, json: () => Promise.resolve([]) });
    await promise;
    expect(engine.getStatus('data')).toBe('empty');
  });

  it('sets error status on HTTP error', async () => {
    const { store, engine } = setup({}, null, false);
    await engine.execute('patient', { source: 'api/patients/1', on: 'mount' });
    expect(engine.getStatus('patient')).toBe('error');
    expect(store.get('/fetch/patient/error')).toEqual({ status: 500, message: 'HTTP 500' });
  });

  it('sets error status on network failure', async () => {
    const store = createStateStore({});
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const engine = createFetchEngine({ store, resolve: (e) => e, fetcher });

    await engine.execute('data', { source: 'api/data', on: 'mount' });
    expect(engine.getStatus('data')).toBe('error');
    expect((store.get('/fetch/data/error') as Record<string, unknown>).message).toBe('Network error');
  });

  it('detects empty array as empty status', async () => {
    const { engine } = setup({}, []);
    await engine.execute('patients', { source: 'api/patients', on: 'mount' });
    expect(engine.getStatus('patients')).toBe('empty');
  });

  it('interpolates URL params', async () => {
    const { engine, fetcher } = setup({}, { id: 1 });
    await engine.execute('patient', { source: 'api/patients/{id}', on: 'mount' }, { id: '123' });
    expect(fetcher).toHaveBeenCalledWith('api/patients/123', expect.any(Object));
  });

  it('executeAll runs all mount configs', async () => {
    const { store, engine } = setup({}, { data: true });
    await engine.executeAll({
      patients: { source: 'api/patients', on: 'mount' },
      config: { source: 'api/config', on: 'mount' },
      manual: { source: 'api/manual', on: 'manual' },
    });
    // mount configs should run, manual should not
    expect(engine.getStatus('patients')).toBe('success');
    expect(engine.getStatus('config')).toBe('success');
    expect(engine.getStatus('manual')).toBe('idle');
  });

  it('sends POST with resolved body', async () => {
    const { engine, fetcher } = setup({}, { success: true });
    await engine.execute('submit', {
      source: 'api/submit',
      on: 'manual',
      method: 'POST',
      body: { name: 'Alice', age: 30 },
    });
    expect(fetcher).toHaveBeenCalledWith('api/submit', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Alice', age: 30 }),
    }));
  });

  it('idle status by default', () => {
    const { engine } = setup();
    expect(engine.getStatus('anything')).toBe('idle');
  });
});
