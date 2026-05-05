/**
 * State path protection — prevents specs from writing to sensitive paths.
 *
 * Two variants:
 * 1. Static — `createStateGuard(['/auth/*', '/session/*'])` — paths fixed at creation.
 * 2. Lazy callback — `createStateGuard(() => protectionRegistry.allPaths())` — paths
 *    evaluated on every check. Used by factory.ts to wire the protection registry,
 *    enabling dynamic per-spec contributions (e.g., derive paths) via RAII.
 *
 * Usage:
 *   const guard = createStateGuard(['/auth/*', '/session/*']);
 *   guard.canWrite('/auth/token') → false
 *   guard.canWrite('/form/name') → true
 *   guard.canRead('/auth/token') → true (reading is always allowed)
 */

export interface StateGuard {
  canWrite: (path: string) => boolean;
  assertCanWrite: (path: string) => void;
}

type ProtectedPathsSource = string[] | (() => string[]);

export function createStateGuard(source?: ProtectedPathsSource): StateGuard {
  const getProtectedPaths = (): string[] => {
    if (!source) return [];
    if (typeof source === 'function') return source();
    return source;
  };

  function matchesProtected(path: string): boolean {
    const protectedPaths = getProtectedPaths();
    if (protectedPaths.length === 0) return false;

    return protectedPaths.some((pattern) => {
      if (pattern.endsWith('/*')) {
        // Wildcard: "/auth/*" matches "/auth/token", "/auth/role", etc.
        const prefix = pattern.slice(0, -1); // "/auth/"
        return path.startsWith(prefix) || path === pattern.slice(0, -2); // "/auth"
      }
      // Exact match
      return path === pattern;
    });
  }

  function canWrite(path: string): boolean {
    return !matchesProtected(path);
  }

  function assertCanWrite(path: string): void {
    if (!canWrite(path)) {
      throw new Error(
        `State write blocked: "${path}" is a protected path. ` +
        `Protected paths can be read but not modified from specs.`
      );
    }
  }

  return { canWrite, assertCanWrite };
}
