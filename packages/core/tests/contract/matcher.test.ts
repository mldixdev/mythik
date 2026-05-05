import { describe, it, expect } from 'vitest';
import { matchEndpoint } from '../../src/contract/matcher.js';
import type { EndpointInfo } from '../../src/contract/types.js';

function makeEndpoints(entries: Array<[string, Partial<EndpointInfo>]>): Map<string, EndpointInfo> {
  const map = new Map<string, EndpointInfo>();
  for (const [key, info] of entries) {
    map.set(key, { path: '', method: 'GET', params: {}, source: 'test', ...info });
  }
  return map;
}

const catalogs = new Set(['years', 'monthes', 'organizations']);

describe('matchEndpoint', () => {
  it('exact match for query endpoint', () => {
    const endpoints = makeEndpoints([
      ['GET /api/records/v4', { path: '/api/records/v4', method: 'GET' }],
    ]);
    const result = matchEndpoint('/api/records/v4', 'GET', endpoints, catalogs, true);
    expect(result.matched).toBe(true);
    expect(result.endpoint!.path).toBe('/api/records/v4');
  });

  it('CRUD match — PUT /api/items/:param → PUT /api/items/:id', () => {
    const endpoints = makeEndpoints([
      ['PUT /api/items/:id', { path: '/api/items/:id', method: 'PUT', crud: { insertable: [], updatable: ['name'] } }],
    ]);
    const result = matchEndpoint('/api/items/:param', 'PUT', endpoints, catalogs, true);
    expect(result.matched).toBe(true);
  });

  it('catalog match — /api/catalogs/years', () => {
    const endpoints = makeEndpoints([]);
    const result = matchEndpoint('/api/catalogs/years', 'GET', endpoints, catalogs, true);
    expect(result.matched).toBe(true);
    expect(result.matchType).toBe('catalog');
  });

  it('auth match — /api/auth/login', () => {
    const result = matchEndpoint('/api/auth/login', 'POST', new Map(), new Set(), true);
    expect(result.matched).toBe(true);
    expect(result.matchType).toBe('builtin');
  });

  it('spec serving match — /api/screens/:param', () => {
    const result = matchEndpoint('/api/screens/:param', 'GET', new Map(), new Set(), false);
    expect(result.matched).toBe(true);
    expect(result.matchType).toBe('builtin');
  });

  it('no match — returns suggestion', () => {
    const endpoints = makeEndpoints([
      ['GET /api/records/v4', { path: '/api/records/v4' }],
    ]);
    const result = matchEndpoint('/api/records/v5', 'GET', endpoints, catalogs, true);
    expect(result.matched).toBe(false);
    expect(result.suggestion).toContain('/api/records/v4');
  });

  it('no match on catalog — lists available', () => {
    const result = matchEndpoint('/api/catalogs/departamentos', 'GET', new Map(), catalogs, true);
    expect(result.matched).toBe(false);
    expect(result.availableCatalogs).toContain('years');
  });
});
