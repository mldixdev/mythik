import { scanDeps } from '../renderer/deps.js';
import type { StateStore } from '../state/store.js';
import type { Resolver } from '../expressions/resolver.js';
import type { ActionDefinition, DataSourceConfig } from '../types.js';

export interface DataSourcesEngineConfig {
  store: StateStore;
  resolver: Resolver;
  dataSources: Record<string, DataSourceConfig>;
  /** Override for testing — defaults to global fetch. */
  fetcher?: (url: string, options?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
}

export interface DataSourcesEngine {
  /** Start reactive data fetching. Performs initial fetch for sources with initialFetch:true. */
  mount: () => void;
  /** Force re-fetch a specific dataSource by id. */
  refresh: (id: string) => Promise<void>;
  /** Stop all reactivity and clean up. */
  unmount: () => void;
  /** Returns an ActionDefinition for registering refreshDataSource in the dispatcher. */
  getActionDefinition: () => ActionDefinition;
}

/** Values that are treated as "inactive filter" and omitted from query strings. */
function isInactiveParam(value: unknown): boolean {
  return value === null || value === undefined || value === '' || value === 'all';
}

/** Serialize resolved params into a query string, omitting inactive values. */
function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (!isInactiveParam(value)) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export function createDataSourcesEngine(config: DataSourcesEngineConfig): DataSourcesEngine {
  const { store, resolver, dataSources } = config;
  const fetcher = config.fetcher ?? globalThis.fetch?.bind(globalThis);

  let mounted = false;
  let unsubscribe: (() => void) | null = null;
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Pre-compute dependency sets for each dataSource (params + url + headers)
  const depsMap = new Map<string, Set<string>>();
  // Pre-compute URL-only deps separately for skip-on-undefined check (v49 Item E)
  const urlDepsMap = new Map<string, Set<string>>();
  for (const [id, ds] of Object.entries(dataSources)) {
    const deps = new Set<string>();
    // Scan params for $state dependencies
    if (ds.params) {
      for (const paramDeps of scanDeps(ds.params)) {
        deps.add(paramDeps);
      }
    }
    // Scan URL for $template/${path} dependencies
    const urlDeps = scanDeps(ds.url);
    for (const urlDep of urlDeps) {
      deps.add(urlDep);
    }
    urlDepsMap.set(id, urlDeps);
    // Scan headers
    if (ds.headers) {
      for (const headerDep of scanDeps(ds.headers)) {
        deps.add(headerDep);
      }
    }
    depsMap.set(id, deps);
  }

  /** Execute a fetch for one dataSource. */
  async function fetchDataSource(id: string): Promise<void> {
    const ds = dataSources[id];
    const target = ds.target;
    const loadingPath = `${target.slice(1)}Loading`;
    const errorPath = `${target.slice(1)}Error`;
    const deferredPath = `${target.slice(1)}Deferred`;

    // Skip-on-undefined-URL-deps (v49 Item E): if URL template depends on
    // unresolved state, defer to reactive subscription. Sets deferred=true so
    // consumers can render "waiting for prerequisite" UI distinct from loading.
    const urlDeps = urlDepsMap.get(id);
    if (urlDeps && urlDeps.size > 0) {
      for (const dep of urlDeps) {
        const value = store.get(dep);
        if (value === undefined || value === null || value === '') {
          store.set(`/${deferredPath}`, true);
          store.set(`/${loadingPath}`, false);
          return;
        }
      }
    }
    // URL deps resolved (or no deps) — clear deferred flag and proceed
    store.set(`/${deferredPath}`, false);

    // Set loading state
    store.set(`/${loadingPath}`, true);
    store.set(`/${errorPath}`, null);

    // Clear target if emptyWhileLoading
    if (ds.emptyWhileLoading) {
      store.set(target, null);
    }

    try {
      // Resolve URL
      const resolvedUrl = String(resolver.resolve(ds.url));

      // Resolve params and build query string
      let queryString = '';
      if (ds.params) {
        const resolvedParams: Record<string, unknown> = {};
        for (const [key, expr] of Object.entries(ds.params)) {
          resolvedParams[key] = resolver.resolve(expr);
        }
        queryString = buildQueryString(resolvedParams);
      }

      const fullUrl = resolvedUrl + queryString;

      // Resolve headers
      const options: RequestInit = {
        method: ds.method ?? 'GET',
      };

      if (ds.headers) {
        options.headers = resolver.resolve(ds.headers) as Record<string, string>;
      }

      const response = await fetcher(fullUrl, options);

      if (!response.ok) {
        store.set(`/${loadingPath}`, false);
        store.set(`/${errorPath}`, { status: response.status, message: `HTTP ${response.status}` });
        return;
      }

      const data = await response.json();
      store.set(target, data);
      store.set(`/${loadingPath}`, false);
    } catch (err) {
      store.set(`/${loadingPath}`, false);
      store.set(`/${errorPath}`, {
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  /** Schedule a fetch with optional debounce. */
  function scheduleFetch(id: string): void {
    const ds = dataSources[id];
    const debounce = ds.debounce ?? 0;

    // Clear existing timer
    const existingTimer = debounceTimers.get(id);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    if (debounce > 0) {
      const timer = setTimeout(() => {
        debounceTimers.delete(id);
        fetchDataSource(id);
      }, debounce);
      debounceTimers.set(id, timer);
    } else {
      fetchDataSource(id);
    }
  }

  /** Check if a changed path overlaps with any dependency of a dataSource. */
  function pathOverlaps(depPath: string, changedPath: string): boolean {
    return (
      depPath === changedPath ||
      depPath.startsWith(changedPath + '/') ||
      changedPath.startsWith(depPath + '/')
    );
  }

  function mount(): void {
    if (mounted) return;
    mounted = true;

    // Initial fetch for all dataSources with initialFetch !== false
    for (const [id, ds] of Object.entries(dataSources)) {
      if (ds.initialFetch !== false) {
        fetchDataSource(id);
      }
    }

    // Subscribe to state changes for reactive re-fetching
    unsubscribe = store.subscribe((_state, changedPath) => {
      if (!mounted) return;

      for (const [id, ds] of Object.entries(dataSources)) {
        // Skip manual-trigger dataSources
        const trigger = ds.trigger ?? 'auto';
        if (trigger !== 'auto') continue;

        // Check if changed path overlaps with this dataSource's dependencies
        const deps = depsMap.get(id);
        if (!deps) continue;

        // Skip if the change is to our own target (avoid infinite loops)
        if (changedPath === ds.target || changedPath.startsWith(ds.target + '/')) continue;
        // Skip loading/error state changes
        const loadingPath = `/${ds.target.slice(1)}Loading`;
        const errorPath = `/${ds.target.slice(1)}Error`;
        if (changedPath === loadingPath || changedPath === errorPath) continue;

        let isDirty = false;
        for (const dep of deps) {
          if (pathOverlaps(dep, changedPath)) {
            isDirty = true;
            break;
          }
        }

        if (isDirty) {
          scheduleFetch(id);
        }
      }
    });
  }

  async function refresh(id: string): Promise<void> {
    if (!dataSources[id]) {
      throw new Error(`Unknown dataSource: "${id}"`);
    }
    if (!mounted) return;  // v49 Item E: no-op after unmount
    await fetchDataSource(id);
  }

  function unmount(): void {
    mounted = false;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    // Clear all pending debounce timers
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer);
    }
    debounceTimers.clear();
  }

  function getActionDefinition(): ActionDefinition {
    return {
      name: 'refreshDataSource',
      handler: async (params) => {
        const id = params.id as string;
        if (!id) throw new Error('refreshDataSource requires "id" param');
        await refresh(id);
      },
    };
  }

  return { mount, refresh, unmount, getActionDefinition };
}
