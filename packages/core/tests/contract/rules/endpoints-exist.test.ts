import { describe, it, expect } from 'vitest';
import { endpointsExistRule } from '../../../src/contract/rules/endpoints-exist.js';
import type { ContractContext, FetchReference, EndpointInfo } from '../../../src/contract/types.js';

function makeContext(overrides: Partial<ContractContext> = {}): ContractContext {
  return { endpoints: new Map(), catalogs: new Set(), policies: new Map(), fetches: [], authConfigured: true, ...overrides };
}

describe('endpoints-exist rule', () => {
  it('no findings when all fetches match', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/items', { path: '/api/items', method: 'GET', params: {}, source: 'api' }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/items', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '/api/items' },
    ];
    const findings = endpointsExistRule.check(makeContext({ endpoints, fetches }));
    expect(findings).toHaveLength(0);
  });

  it('error when endpoint does not exist', () => {
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/nonexistent', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '/api/nonexistent' },
    ];
    const findings = endpointsExistRule.check(makeContext({ fetches }));
    expect(findings).toHaveLength(1);
    expect(findings[0].level).toBe('error');
    expect(findings[0].rule).toBe('endpoints-exist');
    expect(findings[0].screen).toBe('s1');
  });

  it('catalogs are valid endpoints', () => {
    const catalogs = new Set(['years', 'monthes']);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/catalogs/years', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '/api/catalogs/years' },
    ];
    const findings = endpointsExistRule.check(makeContext({ catalogs, fetches }));
    expect(findings).toHaveLength(0);
  });

  it('suggests similar endpoint paths', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/records/v4', { path: '/api/records/v4', method: 'GET', params: {}, source: 'api' }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/records/v5', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '/api/records/v5' },
    ];
    const findings = endpointsExistRule.check(makeContext({ endpoints, fetches }));
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toContain('/api/records/v4');
  });

  it('auth builtins are valid', () => {
    const fetches: FetchReference[] = [
      { screen: 'login', path: '/api/auth/login', method: 'POST', queryParams: [], bodyFields: [], rawUrl: '/api/auth/login' },
    ];
    const findings = endpointsExistRule.check(makeContext({ fetches, authConfigured: true }));
    expect(findings).toHaveLength(0);
  });
});
