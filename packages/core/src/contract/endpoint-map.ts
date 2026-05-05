import type { EndpointInfo } from './types.js';

interface ApiSpecInput {
  id: string;
  spec: Record<string, unknown>;
}

export interface EndpointMapResult {
  endpoints: Map<string, EndpointInfo>;
  catalogs: Set<string>;
  policies: Map<string, { roles: string[] }>;
  authConfigured: boolean;
}

/**
 * Build a consolidated endpoint map from one or more api-specs.
 * CRUD endpoints generate POST, PUT/:id, DELETE/:id entries.
 */
export function buildEndpointMap(apiSpecs: ApiSpecInput[]): EndpointMapResult {
  const endpoints = new Map<string, EndpointInfo>();
  const catalogs = new Set<string>();
  const policies = new Map<string, { roles: string[] }>();
  let authConfigured = false;

  for (const { id: source, spec } of apiSpecs) {
    // Catalogs
    const specCatalogs = spec.catalogs as Record<string, unknown> | undefined;
    if (specCatalogs) {
      for (const name of Object.keys(specCatalogs)) {
        catalogs.add(name);
      }
    }

    // Auth policies
    const auth = spec.auth as Record<string, unknown> | undefined;
    if (auth) {
      authConfigured = true;
      const specPolicies = auth.policies as Record<string, { roles: string[] }> | undefined;
      if (specPolicies) {
        for (const [name, policy] of Object.entries(specPolicies)) {
          policies.set(name, policy);
        }
      }
    }

    // Endpoints
    const specEndpoints = spec.endpoints as Record<string, Record<string, unknown>> | undefined;
    if (!specEndpoints) continue;

    for (const [, ep] of Object.entries(specEndpoints)) {
      const path = ep.path as string;
      const method = ((ep.method as string) ?? 'GET').toUpperCase();
      const params = (ep.params as Record<string, { type: string }>) ?? {};
      const policy = ep.policy as string | undefined;
      const crud = ep.crud as { table: string; primaryKey: string; insertable: string[]; updatable: string[] } | undefined;

      const baseInfo: Omit<EndpointInfo, 'path' | 'method'> = {
        params,
        policy,
        source,
        crud: crud ? { insertable: crud.insertable, updatable: crud.updatable } : undefined,
      };

      if (ep.query || ep.handler) {
        endpoints.set(`${method} ${path}`, { ...baseInfo, path, method });
      }

      if (crud) {
        endpoints.set(`POST ${path}`, { ...baseInfo, path, method: 'POST' });
        endpoints.set(`PUT ${path}/:id`, { ...baseInfo, path: `${path}/:id`, method: 'PUT' });
        endpoints.set(`DELETE ${path}/:id`, { ...baseInfo, path: `${path}/:id`, method: 'DELETE' });
      }
    }
  }

  return { endpoints, catalogs, policies, authConfigured };
}
