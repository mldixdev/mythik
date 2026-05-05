import type { EndpointInfo } from './types.js';
import { suggest } from '../utils/levenshtein.js';

export interface MatchResult {
  matched: boolean;
  endpoint?: EndpointInfo;
  matchType?: 'exact' | 'catalog' | 'builtin';
  suggestion?: string;
  availableCatalogs?: string[];
}

const BUILTIN_PATHS_AUTH = ['/api/auth/login', '/api/auth/refresh'];
const BUILTIN_PATHS_SERVING = ['/api/screens/:id', '/api/app/:id'];

/**
 * Match a fetch URL path + method against known endpoints, catalogs, and builtins.
 */
export function matchEndpoint(
  path: string,
  method: string,
  endpoints: Map<string, EndpointInfo>,
  catalogs: Set<string>,
  authConfigured: boolean,
): MatchResult {
  const paramNormalized = path.replace(/:param/g, ':id');

  // 1. Exact match: METHOD + path
  const key = `${method} ${path}`;
  if (endpoints.has(key)) {
    return { matched: true, endpoint: endpoints.get(key), matchType: 'exact' };
  }

  // 2. Parameterized match: :param → :id
  const paramKey = `${method} ${paramNormalized}`;
  if (endpoints.has(paramKey)) {
    return { matched: true, endpoint: endpoints.get(paramKey), matchType: 'exact' };
  }

  // 3. Catalog match: /api/catalogs/{name}
  const catalogMatch = path.match(/^\/api\/catalogs\/(.+)$/);
  if (catalogMatch) {
    const catalogName = catalogMatch[1];
    if (catalogs.has(catalogName)) {
      return { matched: true, matchType: 'catalog' };
    }
    const suggested = suggest(catalogName, Array.from(catalogs));
    return {
      matched: false,
      suggestion: suggested ? `Did you mean "${suggested}"?` : undefined,
      availableCatalogs: Array.from(catalogs),
    };
  }

  // 4. Builtin auth routes
  if (authConfigured) {
    for (const builtin of BUILTIN_PATHS_AUTH) {
      if (path === builtin || paramNormalized === builtin) {
        return { matched: true, matchType: 'builtin' };
      }
    }
  }

  // 5. Builtin spec serving routes (always available)
  for (const builtin of BUILTIN_PATHS_SERVING) {
    const builtinParam = builtin.replace(/:id/g, ':param');
    if (path === builtin || path === builtinParam || paramNormalized === builtin) {
      return { matched: true, matchType: 'builtin' };
    }
  }

  // 6. No match — fuzzy suggestion from all endpoint paths
  const allPaths = Array.from(endpoints.values()).map(e => e.path);
  const uniquePaths = [...new Set(allPaths)];
  const suggested = suggest(path, uniquePaths);

  return {
    matched: false,
    suggestion: suggested ? `Did you mean "${suggested}"?` : undefined,
  };
}
