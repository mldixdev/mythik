import { describe, it, expect } from 'vitest';
import { permissionsConsistentRule } from '../../../src/contract/rules/permissions-consistent.js';
import type { ContractContext, FetchReference, EndpointInfo } from '../../../src/contract/types.js';

function makeContext(overrides: Partial<ContractContext> = {}): ContractContext {
  return { endpoints: new Map(), catalogs: new Set(), policies: new Map(), fetches: [], authConfigured: true, ...overrides };
}

describe('permissions-consistent rule', () => {
  it('no findings when permissions are consistent', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/data', { path: '/api/data', method: 'GET', params: {}, source: 'api', policy: 'records' }],
    ]);
    const policies = new Map([['records', { roles: ['ADMIN', 'EDITOR'] }]]);
    const fetches: FetchReference[] = [
      { screen: 'dashboard', path: '/api/data', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '' },
    ];
    const roleAccess = { 'ADMIN': ['*'], 'EDITOR': ['dashboard'] };
    expect(permissionsConsistentRule.check(makeContext({ endpoints, policies, fetches, roleAccess }))).toHaveLength(0);
  });

  it('warning when role can access screen but not its endpoint', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['DELETE /api/items/:id', { path: '/api/items/:id', method: 'DELETE', params: {}, source: 'api', policy: 'admin' }],
    ]);
    const policies = new Map([['admin', { roles: ['ADMIN'] }]]);
    const fetches: FetchReference[] = [
      { screen: 'item-list', path: '/api/items/:param', method: 'DELETE', queryParams: [], bodyFields: [], rawUrl: '' },
    ];
    const roleAccess = { 'ADMIN': ['*'], 'EDITOR': ['item-list'] };
    const findings = permissionsConsistentRule.check(makeContext({ endpoints, policies, fetches, roleAccess }));
    expect(findings).toHaveLength(1);
    expect(findings[0].level).toBe('warning');
    expect(findings[0].message).toContain('EDITOR');
    expect(findings[0].message).toContain('item-list');
    expect(findings[0].message).toContain('ADMIN');
  });

  it('wildcard role access (*) covers all screens', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/data', { path: '/api/data', method: 'GET', params: {}, source: 'api', policy: 'all' }],
    ]);
    const policies = new Map([['all', { roles: ['ADMIN'] }]]);
    const fetches: FetchReference[] = [
      { screen: 'any', path: '/api/data', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '' },
    ];
    const roleAccess = { 'ADMIN': ['*'] };
    expect(permissionsConsistentRule.check(makeContext({ endpoints, policies, fetches, roleAccess }))).toHaveLength(0);
  });

  it('skips when no roleAccess configured', () => {
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/data', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '' },
    ];
    expect(permissionsConsistentRule.check(makeContext({ fetches }))).toHaveLength(0);
  });

  it('public policy is accessible by all roles', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/public', { path: '/api/public', method: 'GET', params: {}, source: 'api', policy: 'public' }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 'home', path: '/api/public', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '' },
    ];
    const roleAccess = { 'VIEWER': ['home'] };
    expect(permissionsConsistentRule.check(makeContext({ endpoints, fetches, roleAccess }))).toHaveLength(0);
  });

  it('endpoints without policy are accessible by all', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/data', { path: '/api/data', method: 'GET', params: {}, source: 'api' }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 'dash', path: '/api/data', method: 'GET', queryParams: [], bodyFields: [], rawUrl: '' },
    ];
    const roleAccess = { 'ANY': ['dash'] };
    expect(permissionsConsistentRule.check(makeContext({ endpoints, fetches, roleAccess }))).toHaveLength(0);
  });
});
