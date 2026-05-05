/**
 * Protection registry for state paths. Used by createStateGuard (state-protection.ts)
 * via lazy callback to determine which paths are protected at any moment.
 *
 * Contributors call `contribute(paths)` to add paths and receive a release token.
 * Calling the release token removes only that contribution — other contributors'
 * paths remain protected. RAII pattern: release token is captured in a cleanup
 * closure (e.g., useEffect cleanup) so releases can't be forgotten.
 *
 * Internal — not re-exported from `core/index.ts`. Accessed by mountSpecRuntime
 * via MythikInstance.
 */

export interface ProtectionRegistry {
  /** Add a set of protected paths. Returns a release token. */
  contribute: (paths: string[]) => () => void;
  /** Snapshot all currently protected paths from all contributors. */
  allPaths: () => string[];
}

export interface ProtectionRegistryConfig {
  /** Default paths included from registry creation; never released. */
  defaultPaths?: string[];
}

export function createProtectionRegistry(config?: ProtectionRegistryConfig): ProtectionRegistry {
  const contributions = new Map<symbol, string[]>();

  if (config?.defaultPaths && config.defaultPaths.length > 0) {
    contributions.set(Symbol('default'), [...config.defaultPaths]);
  }

  return {
    contribute(paths: string[]): () => void {
      const token = Symbol('contributor');
      contributions.set(token, [...paths]);
      return () => {
        contributions.delete(token);
      };
    },
    allPaths(): string[] {
      const all: string[] = [];
      for (const paths of contributions.values()) {
        all.push(...paths);
      }
      return all;
    },
  };
}
