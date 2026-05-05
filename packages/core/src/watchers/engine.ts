import type { StateStore } from '../state/store.js';
import type { ActionBinding, ResolveFn } from '../types.js';

export interface WatcherConfig {
  /** JSON Pointer path → list of actions to trigger on change */
  watch: Record<string, ActionBinding[]>;
}

export interface ActionDispatcher {
  dispatch: (binding: ActionBinding, resolve: ResolveFn) => void | Promise<void>;
}

export interface WatcherEngine {
  /** Start watching. Returns cleanup function. */
  start: () => () => void;
}

/**
 * Creates a watcher engine that subscribes to state paths
 * and dispatches actions when values change.
 */
export function createWatcherEngine(
  store: StateStore,
  config: WatcherConfig,
  dispatcher: ActionDispatcher,
  resolve: ResolveFn,
): WatcherEngine {
  function start(): () => void {
    const cleanups: (() => void)[] = [];

    for (const [path, bindings] of Object.entries(config.watch)) {
      const unsub = store.subscribePath(path, () => {
        // Fire all actions for this path sequentially
        for (const binding of bindings) {
          dispatcher.dispatch(binding, resolve);
        }
      });
      cleanups.push(unsub);
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }

  return { start };
}
