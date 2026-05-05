import type { StateStore } from '../state/store.js';
import type { ResolveFn } from '../types.js';

export interface FetchConfig {
  source: string; // URL template with {param} interpolation
  on: 'mount' | 'manual';
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  loading?: unknown; // Config for loading state UI
  error?: unknown; // Config for error state UI
  empty?: unknown; // Config for empty state UI
}

export interface FetchEngineConfig {
  store: StateStore;
  resolve: ResolveFn;
  /** Override for testing — defaults to global fetch */
  fetcher?: (url: string, options?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
}

export interface FetchEngine {
  execute: (key: string, config: FetchConfig, params?: Record<string, unknown>) => Promise<void>;
  executeAll: (configs: Record<string, FetchConfig>, params?: Record<string, unknown>) => Promise<void>;
  getStatus: (key: string) => 'idle' | 'loading' | 'success' | 'error' | 'empty';
}

/**
 * Interpolate URL template: "api/patients/{id}" with params { id: "123" } → "api/patients/123"
 */
function interpolateUrl(template: string, params: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

export function createFetchEngine(config: FetchEngineConfig): FetchEngine {
  const { store, resolve } = config;
  const fetcher = config.fetcher ?? globalThis.fetch?.bind(globalThis);

  async function execute(key: string, fetchConfig: FetchConfig, params?: Record<string, unknown>): Promise<void> {
    const url = interpolateUrl(fetchConfig.source, params ?? {});
    const method = fetchConfig.method ?? 'GET';

    // Set loading state
    store.set(`/fetch/${key}/status`, 'loading');
    store.set(`/fetch/${key}/error`, null);

    try {
      const options: RequestInit = { method };

      if (fetchConfig.headers) {
        options.headers = fetchConfig.headers;
      }

      if (fetchConfig.body && method !== 'GET') {
        options.headers = { ...options.headers as Record<string, string>, 'Content-Type': 'application/json' };
        // Resolve expressions in body
        const resolvedBody: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fetchConfig.body)) {
          resolvedBody[k] = resolve(v);
        }
        options.body = JSON.stringify(resolvedBody);
      }

      const response = await fetcher(url, options);

      if (!response.ok) {
        store.set(`/fetch/${key}/status`, 'error');
        store.set(`/fetch/${key}/error`, { status: response.status, message: `HTTP ${response.status}` });
        return;
      }

      const data = await response.json();

      // Check if empty
      const isEmpty = data === null || data === undefined
        || (Array.isArray(data) && data.length === 0)
        || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data as Record<string, unknown>).length === 0);

      store.set(`/${key}`, data);
      store.set(`/fetch/${key}/status`, isEmpty ? 'empty' : 'success');
    } catch (err) {
      store.set(`/fetch/${key}/status`, 'error');
      store.set(`/fetch/${key}/error`, {
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  async function executeAll(configs: Record<string, FetchConfig>, params?: Record<string, unknown>): Promise<void> {
    const mountConfigs = Object.entries(configs).filter(([, c]) => c.on === 'mount');
    await Promise.all(mountConfigs.map(([key, c]) => execute(key, c, params)));
  }

  function getStatus(key: string): 'idle' | 'loading' | 'success' | 'error' | 'empty' {
    return (store.get(`/fetch/${key}/status`) as string as ReturnType<typeof getStatus>) ?? 'idle';
  }

  return { execute, executeAll, getStatus };
}
