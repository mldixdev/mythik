import { describe, it, expect } from 'vitest';
import { fieldsValidRule } from '../../../src/contract/rules/fields-valid.js';
import type { ContractContext, FetchReference, EndpointInfo } from '../../../src/contract/types.js';

function makeContext(overrides: Partial<ContractContext> = {}): ContractContext {
  return { endpoints: new Map(), catalogs: new Set(), policies: new Map(), fetches: [], authConfigured: false, ...overrides };
}

describe('fields-valid rule', () => {
  it('no findings when all body fields are valid', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['PUT /api/items/:id', { path: '/api/items/:id', method: 'PUT', params: {}, source: 'api', crud: { insertable: ['name', 'price'], updatable: ['name', 'price'] } }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/items/:param', method: 'PUT', queryParams: [], bodyFields: ['name', 'price'], rawUrl: '/api/items/123' },
    ];
    expect(fieldsValidRule.check(makeContext({ endpoints, fetches }))).toHaveLength(0);
  });

  it('error when body field not in updatable (PUT)', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['PUT /api/items/:id', { path: '/api/items/:id', method: 'PUT', params: {}, source: 'api', crud: { insertable: ['name', 'price', 'category'], updatable: ['name', 'price'] } }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/items/:param', method: 'PUT', queryParams: [], bodyFields: ['name', 'category'], rawUrl: '/api/items/123' },
    ];
    const findings = fieldsValidRule.check(makeContext({ endpoints, fetches }));
    expect(findings).toHaveLength(1);
    expect(findings[0].level).toBe('error');
    expect(findings[0].message).toContain('category');
    expect(findings[0].message).toContain('updatable');
  });

  it('error when body field not in insertable (POST)', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['POST /api/items', { path: '/api/items', method: 'POST', params: {}, source: 'api', crud: { insertable: ['name', 'price'], updatable: ['name'] } }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/items', method: 'POST', queryParams: [], bodyFields: ['name', 'unknown_field'], rawUrl: '/api/items' },
    ];
    const findings = fieldsValidRule.check(makeContext({ endpoints, fetches }));
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain('unknown_field');
  });

  it('suggests similar field names via Levenshtein', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['PUT /api/items/:id', { path: '/api/items/:id', method: 'PUT', params: {}, source: 'api', crud: { insertable: [], updatable: ['allocatedAmount', 'spentAmount'] } }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/items/:param', method: 'PUT', queryParams: [], bodyFields: ['estimatedAmount'], rawUrl: '/api/items/1' },
    ];
    const findings = fieldsValidRule.check(makeContext({ endpoints, fetches }));
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toContain('allocatedAmount');
  });

  it('skips GET (no body validation)', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/items', { path: '/api/items', method: 'GET', params: {}, source: 'api', crud: { insertable: ['name'], updatable: ['name'] } }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/items', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '/api/items' },
    ];
    expect(fieldsValidRule.check(makeContext({ endpoints, fetches }))).toHaveLength(0);
  });

  it('skips non-crud endpoints', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['POST /api/custom', { path: '/api/custom', method: 'POST', params: {}, source: 'api' }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/custom', method: 'POST', queryParams: [], bodyFields: ['anything'], rawUrl: '/api/custom' },
    ];
    expect(fieldsValidRule.check(makeContext({ endpoints, fetches }))).toHaveLength(0);
  });
});
