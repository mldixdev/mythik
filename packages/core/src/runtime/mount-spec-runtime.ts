import { createDeriveEngine, type DeriveEngine } from '../derive/evaluator.js';
import { createDataSourcesEngine, type DataSourcesEngine } from '../data/data-sources.js';
import { createEditorSessionEngine } from '../editor-session/engine.js';
import type { EditorSessionEngine } from '../editor-session/types.js';
import type { Spec } from '../types.js';
import type { StateStore } from '../state/store.js';
import type { Resolver } from '../expressions/resolver.js';
import type { ActionDispatcherInstance } from '../actions/dispatcher.js';
import type { ProtectionRegistry } from '../security/protection-registry.js';
import type { UrlGuard } from '../security/url-whitelist.js';
import { RESERVED_PATHS } from '../state/reserved-paths.js';

/**
 * Per-spec runtime helper. Instantiates DeriveEngine, EditorSessionEngine, and
 * DataSourcesEngine based on the spec's derive/editorSessions/dataSources
 * fields, wires their lifecycle to the caller's mount/unmount, and contributes
 * their framework-owned paths to the protection registry via RAII handles.
 *
 * Internal — NOT re-exported from `core/index.ts` directly. Re-exported with
 * @internal JSDoc tag in Task 9 for use by mythik-react and mythik-react-native
 * renderers.
 *
 * Lifecycle ordering inside this function:
 *   1. derive.mount() — sync, populates derive paths from current state
 *   2. subscribe derive.onStateChange to store — keeps derive reactive
 *   3. contribute derive paths to protection registry — RAII release token captured
 *   4. create editor sessions, register editor actions, and protect /ui/editorSessions/*
 *   5. dispatcher.registerAction(refreshDataSource) - silent overwrite via Map.set
 *   6. dataSources.mount() - initial fetch with skip-on-undefined-URL-deps
 *
 * unmount() reverses in reverse order.
 *
 * Re-entrancy: subscriptions are allowed to fire recursively on derive's own
 * writes. This is intentional — chained derives (B depends on A which depends
 * on input) rely on the cascade: when input changes, A is recomputed and writes
 * itself; that write fires the subscription again with changedPath=A, which lets
 * B see it as dirty. Infinite loops are prevented by the topo-sort at mount()
 * time (circular deps throw) and by the derive engine's per-call dirty check
 * (a derive's own write doesn't make itself dirty since its deps don't include
 * its own path).
 *
 * Engines self-coordinate via reactive subscriptions — no ordering dependency
 * on caller's initialActions. The skip-on-undefined-URL-deps behavior in
 * DataSourcesEngine handles initial-fetch races for any state source.
 */

export interface MountSpecRuntimeDeps {
  store: StateStore;
  resolver: Resolver;
  dispatcher: ActionDispatcherInstance;
  protectionRegistry: ProtectionRegistry;
  /** Override fetch for testing. Defaults to engine's globalThis.fetch fallback. */
  fetcher?: (url: string, options?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
  urlGuard?: UrlGuard;
}

export interface SpecRuntime {
  unmount: () => void;
  editorSessionEngine?: EditorSessionEngine | null;
}

export function mountSpecRuntime(spec: Spec, deps: MountSpecRuntimeDeps): SpecRuntime {
  const { store, resolver, dispatcher, protectionRegistry, fetcher, urlGuard } = deps;

  const cleanups: Array<() => void> = [];
  let deriveEngine: DeriveEngine | null = null;
  let dataSourcesEngine: DataSourcesEngine | null = null;
  let editorSessionEngine: EditorSessionEngine | null = null;

  // ── Derive ──
  if (spec.derive && Object.keys(spec.derive).length > 0) {
    deriveEngine = createDeriveEngine({ store, resolver, derive: spec.derive });
    deriveEngine.mount();

    // Subscribe to state changes for reactive recompute. Re-entrancy is
    // allowed (and required) so chained derives can cascade — see header
    // doc above for why this is safe.
    const unsub = store.subscribe((_state, changedPath) => {
      deriveEngine!.onStateChange(changedPath);
    });
    cleanups.push(unsub);

    // RAII contribute to protection registry
    const release = protectionRegistry.contribute(deriveEngine.getProtectedPaths());
    cleanups.push(release);
  }

  // ── Editor Sessions ──
  if (spec.editorSessions && Object.keys(spec.editorSessions).length > 0) {
    editorSessionEngine = createEditorSessionEngine({
      store,
      sessions: spec.editorSessions,
      resolve: (expr: unknown) => resolver.resolve(expr),
      fetcher,
      urlGuard,
    });

    for (const action of editorSessionEngine.getActionDefinitions()) {
      dispatcher.registerAction(action);
    }

    const release = protectionRegistry.contribute([`${RESERVED_PATHS.EDITOR_SESSIONS}/*`]);
    cleanups.push(release);
  }

  // ── DataSources ──
  if (spec.dataSources && Object.keys(spec.dataSources).length > 0) {
    dataSourcesEngine = createDataSourcesEngine({
      store,
      resolver,
      dataSources: spec.dataSources,
      fetcher,
    });
    // Register refreshDataSource action with the per-renderer dispatcher
    // (silent overwrite via Map.set — safe across re-mounts within same renderer).
    dispatcher.registerAction(dataSourcesEngine.getActionDefinition());
    dataSourcesEngine.mount();
  }

  return {
    editorSessionEngine,
    unmount() {
      // Reverse order
      dataSourcesEngine?.unmount();
      editorSessionEngine?.unmount();
      editorSessionEngine = null;
      // Run cleanups in reverse order they were added (release → unsub)
      for (let i = cleanups.length - 1; i >= 0; i--) {
        cleanups[i]();
      }
      cleanups.length = 0;
      deriveEngine?.unmount();
      // null out refs to allow GC and to make subsequent unmount() calls safe
      deriveEngine = null;
      dataSourcesEngine = null;
    },
  };
}
