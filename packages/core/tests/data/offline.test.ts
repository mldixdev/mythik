import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOfflineEngine } from '../../src/data/offline.js';
import { createStateStore } from '../../src/state/store.js';

describe('OfflineEngine', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  const config = {
    strategy: 'queue' as const,
    retryInterval: 30000,
    conflictResolution: 'server-wins' as const,
    cache: { patients: { ttl: 60000 }, config: { ttl: 300000 } },
  };

  it('starts online by default', () => {
    const store = createStateStore({});
    const offline = createOfflineEngine(store, config);
    expect(offline.isOnline()).toBe(true);
  });

  it('toggles online/offline', () => {
    const store = createStateStore({});
    const offline = createOfflineEngine(store, config);
    offline.setOnline(false);
    expect(offline.isOnline()).toBe(false);
    offline.setOnline(true);
    expect(offline.isOnline()).toBe(true);
  });

  it('queues mutations', () => {
    const store = createStateStore({});
    const offline = createOfflineEngine(store, config);
    offline.queueMutation({ action: 'save', url: 'api/patients/1', method: 'PUT', body: { name: 'Alice' } });
    offline.queueMutation({ action: 'delete', url: 'api/patients/2', method: 'DELETE' });
    expect(offline.getQueue()).toHaveLength(2);
    expect(offline.getQueue()[0].action).toBe('save');
    expect(offline.getQueue()[1].action).toBe('delete');
  });

  it('clears queue', () => {
    const store = createStateStore({});
    const offline = createOfflineEngine(store, config);
    offline.queueMutation({ action: 'save', url: 'api/x', method: 'POST' });
    offline.clearQueue();
    expect(offline.getQueue()).toHaveLength(0);
  });

  it('caches data with TTL', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const store = createStateStore({});
    const offline = createOfflineEngine(store, config);

    offline.setCached('patients', [{ id: 1 }]);
    expect(offline.getCached('patients')).toEqual([{ id: 1 }]);
    expect(offline.isCacheValid('patients')).toBe(true);

    // Advance past TTL (60s for patients)
    vi.advanceTimersByTime(61000);
    expect(offline.getCached('patients')).toBeUndefined();
    expect(offline.isCacheValid('patients')).toBe(false);
  });

  it('uses configured TTL per key', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const store = createStateStore({});
    const offline = createOfflineEngine(store, config);

    offline.setCached('config', { theme: 'dark' });

    // 60s later: patients would expire, config should not (300s TTL)
    vi.advanceTimersByTime(61000);
    expect(offline.isCacheValid('config')).toBe(true);

    // 300s later: config expires
    vi.advanceTimersByTime(240000);
    expect(offline.isCacheValid('config')).toBe(false);
  });

  it('returns undefined for uncached key', () => {
    const store = createStateStore({});
    const offline = createOfflineEngine(store, config);
    expect(offline.getCached('nonexistent')).toBeUndefined();
    expect(offline.isCacheValid('nonexistent')).toBe(false);
  });

  it('queued mutations have incrementing IDs', () => {
    const store = createStateStore({});
    const offline = createOfflineEngine(store, config);
    offline.queueMutation({ action: 'a', url: 'x', method: 'POST' });
    offline.queueMutation({ action: 'b', url: 'y', method: 'POST' });
    const queue = offline.getQueue();
    expect(queue[0].id).toBeLessThan(queue[1].id);
  });
});
