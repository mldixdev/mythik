/**
 * Static dependency scanner for Mythik specs.
 * Scans expression trees for $state/$bindState paths without executing them.
 */

import { isOnLazyPath, type ParsedLazyPath } from './lazy-paths.js';

/** Extract ${/path} references from $template strings */
function scanTemplate(template: string): string[] {
  const paths: string[] = [];
  const regex = /\$\{(\/[^}]+)\}/g;
  let match;
  while ((match = regex.exec(template)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

/**
 * Recursively scan a value (props, visible, repeat) for $state and $bindState paths.
 * Returns the set of state paths this value depends on.
 *
 * Optional lazyPaths param skips walks into matched subtrees — used by the
 * renderer engine to avoid spurious cache invalidations on paths whose value
 * is not used at render (resolved at press time by the dispatcher).
 */
export function scanDeps(value: unknown, lazyPaths: ParsedLazyPath[] = []): Set<string> {
  const deps = new Set<string>();

  function walk(v: unknown, currentPath: (string | number)[] = []): void {
    if (v === null || v === undefined || typeof v !== 'object') return;
    if (isOnLazyPath(currentPath, lazyPaths)) return;

    if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) walk(v[i], [...currentPath, i]);
      return;
    }

    const obj = v as Record<string, unknown>;

    // Direct state references
    if ('$state' in obj && typeof obj.$state === 'string') {
      deps.add(obj.$state);
    }
    if ('$bindState' in obj && typeof obj.$bindState === 'string') {
      deps.add(obj.$bindState);
    }

    // $template: extract ${/path} references
    if ('$template' in obj && typeof obj.$template === 'string') {
      for (const path of scanTemplate(obj.$template)) {
        deps.add(path);
      }
    }

    // $prop: track as /__prop/<name> sentinel. Custom element expansions
    // use these paths for cache invalidation — when a consumer prop
    // changes, the engine writes to /__prop/<name> paths which overlap
    // with cached inner-primitive deps and trigger re-render. Only
    // track when $prop is a string (consistent with $state / $bindState
    // defensive checks above).
    if ('$prop' in obj && typeof obj.$prop === 'string') {
      deps.add(`/__prop/${obj.$prop}`);
    }

    // $token: depends on theme preference
    if ('$token' in obj) {
      deps.add('/preferences/theme');
    }

    // $i18n: depends on locale preference
    if ('$i18n' in obj) {
      deps.add('/preferences/locale');
    }

    // $breakpoint: depends on viewport width (new + legacy paths)
    if ('$breakpoint' in obj) {
      deps.add('/ui/device/viewportWidth');
      deps.add('/ui/viewportWidth');
    }

    // $auth: maps to /auth/* state paths
    if ('$auth' in obj && typeof obj.$auth === 'string') {
      const field = obj.$auth;
      if (field === 'isAuthenticated') deps.add('/auth/isAuthenticated');
      else if (field === 'loading') deps.add('/auth/loading');
      else if (field === 'error') deps.add('/auth/error');
      else if (field === 'user') deps.add('/auth/user');
      else deps.add(`/auth/user/${field}`);
    }

    // Recurse into all values
    for (const [k, val] of Object.entries(obj)) {
      walk(val, [...currentPath, k]);
    }
  }

  walk(value);
  return deps;
}

/**
 * Check if two JSON Pointer paths overlap.
 * "/user/name" and "/user" → true (parent changed)
 * "/user" and "/user/name" → true (child changed)
 * "/user/name" and "/user/name" → true (exact match)
 * "/user/name" and "/count" → false
 */
function pathsOverlap(depPath: string, changedPath: string): boolean {
  return (
    depPath === changedPath ||
    depPath.startsWith(changedPath + '/') ||
    changedPath.startsWith(depPath + '/')
  );
}

// --- Render Cache ---

export interface RenderCache {
  get: (elementId: string) => Record<string, unknown> | undefined;
  getDeps: (elementId: string) => Set<string> | undefined;
  set: (elementId: string, props: Record<string, unknown>, deps: Set<string>) => void;
  isDirty: (elementId: string, changedPath: string) => boolean;
  isDirtyForPaths: (elementId: string, changedPaths: Set<string>) => boolean;
  clear: (elementId?: string) => void;
}

export function createRenderCache(): RenderCache {
  const cache = new Map<string, { props: Record<string, unknown>; deps: Set<string> }>();

  return {
    get(elementId: string) {
      return cache.get(elementId)?.props;
    },

    getDeps(elementId: string) {
      return cache.get(elementId)?.deps;
    },

    set(elementId: string, props: Record<string, unknown>, deps: Set<string>) {
      cache.set(elementId, { props, deps });
    },

    isDirty(elementId: string, changedPath: string) {
      const entry = cache.get(elementId);
      if (!entry) return true;
      for (const dep of entry.deps) {
        if (pathsOverlap(dep, changedPath)) return true;
      }
      return false;
    },

    isDirtyForPaths(elementId: string, changedPaths: Set<string>) {
      const entry = cache.get(elementId);
      if (!entry) return true;
      for (const dep of entry.deps) {
        for (const changed of changedPaths) {
          if (pathsOverlap(dep, changed)) return true;
        }
      }
      return false;
    },

    clear(elementId?: string) {
      if (elementId) {
        cache.delete(elementId);
      } else {
        cache.clear();
      }
    },
  };
}
