import { scanDeps } from '../renderer/deps.js';
import type { StateStore } from '../state/store.js';
import type { Resolver } from '../expressions/resolver.js';
import { topologicalSort } from './topo-sort.js';

export interface DeriveEngineConfig {
  store: StateStore;
  resolver: Resolver;
  derive: Record<string, unknown>;
}

export interface DeriveEngine {
  /** Evaluate all derives in topological order. Call once on spec mount. */
  mount: () => void;
  /** Re-evaluate dirty derives after a state change. */
  onStateChange: (changedPath: string) => void;
  /** Stop listening. */
  unmount: () => void;
  /** Get all derive target paths (for state guard protection). */
  getProtectedPaths: () => string[];
}

export function createDeriveEngine(config: DeriveEngineConfig): DeriveEngine {
  const { store, resolver, derive } = config;

  // Pre-compute dependency map: derive path → set of state paths it reads
  const depsMap = new Map<string, Set<string>>();
  for (const [path, expr] of Object.entries(derive)) {
    depsMap.set(path, scanDeps(expr));
  }

  // Topological order (validated on mount, not on creation)
  let sortedPaths: string[] = [];
  let mounted = false;

  function evaluatePath(path: string): void {
    try {
      const expr = derive[path];
      const result = resolver.resolve(expr);
      store.set(path, result);
    } catch (err) {
      console.error(
        `[Mythik derive] Failed to evaluate "${path}": ${err instanceof Error ? err.message : String(err)}`
      );
      // Leave path unwritten — consumer reads undefined. Continue with other derives.
    }
  }

  function mount(): void {
    // Validate and sort
    sortedPaths = topologicalSort(derive, depsMap);
    mounted = true;

    // Evaluate all in order
    for (const path of sortedPaths) {
      evaluatePath(path);
    }
  }

  function onStateChange(changedPath: string): void {
    if (!mounted) return;

    // Find which derives are dirty (depend on the changed path)
    for (const path of sortedPaths) {
      const deps = depsMap.get(path)!;
      let isDirty = false;
      for (const dep of deps) {
        if (dep === changedPath || dep.startsWith(changedPath + '/') || changedPath.startsWith(dep + '/')) {
          isDirty = true;
          break;
        }
      }
      if (isDirty) {
        evaluatePath(path);
      }
    }
  }

  function unmount(): void {
    mounted = false;
  }

  function getProtectedPaths(): string[] {
    return Object.keys(derive);
  }

  return { mount, onStateChange, unmount, getProtectedPaths };
}
