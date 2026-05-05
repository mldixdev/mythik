import type { StateStore } from '../state/store.js';

export interface OfflineConfig {
  strategy: 'queue';
  retryInterval: number;
  conflictResolution: 'server-wins' | 'client-wins' | 'manual';
  cache?: Record<string, { ttl: number }>;
}

export interface QueuedMutation {
  id: number;
  action: string;
  url: string;
  method: string;
  body?: unknown;
  timestamp: number;
}

export interface OfflineEngine {
  isOnline: () => boolean;
  setOnline: (online: boolean) => void;
  queueMutation: (mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) => void;
  getQueue: () => QueuedMutation[];
  clearQueue: () => void;
  getCached: (key: string) => unknown;
  setCached: (key: string, data: unknown, ttl?: number) => void;
  isCacheValid: (key: string) => boolean;
}

export function createOfflineEngine(store: StateStore, config: OfflineConfig): OfflineEngine {
  store.set('/offline/online', true);
  store.set('/offline/queue', []);
  store.set('/offline/cache', {});

  let nextId = 1;

  function isOnline(): boolean {
    return store.get('/offline/online') as boolean;
  }

  function setOnline(online: boolean): void {
    store.set('/offline/online', online);
  }

  function queueMutation(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): void {
    const queue = (store.get('/offline/queue') as QueuedMutation[]) ?? [];
    store.set('/offline/queue', [
      ...queue,
      { ...mutation, id: nextId++, timestamp: Date.now() },
    ]);
  }

  function getQueue(): QueuedMutation[] {
    return (store.get('/offline/queue') as QueuedMutation[]) ?? [];
  }

  function clearQueue(): void {
    store.set('/offline/queue', []);
  }

  function getCached(key: string): unknown {
    const entry = store.get(`/offline/cache/${key}`) as { data: unknown; expiresAt: number } | undefined;
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) return undefined;
    return entry.data;
  }

  function setCached(key: string, data: unknown, ttl?: number): void {
    const configTtl = config.cache?.[key]?.ttl ?? ttl ?? 300000; // Default 5 min
    store.set(`/offline/cache/${key}`, {
      data,
      expiresAt: Date.now() + configTtl,
    });
  }

  function isCacheValid(key: string): boolean {
    const entry = store.get(`/offline/cache/${key}`) as { expiresAt: number } | undefined;
    if (!entry) return false;
    return Date.now() <= entry.expiresAt;
  }

  return { isOnline, setOnline, queueMutation, getQueue, clearQueue, getCached, setCached, isCacheValid };
}
