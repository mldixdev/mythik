import { describe, it, expect } from 'vitest';
import { paramsMatchRule } from '../../../src/contract/rules/params-match.js';
import type { ContractContext, FetchReference, EndpointInfo } from '../../../src/contract/types.js';

function makeContext(overrides: Partial<ContractContext> = {}): ContractContext {
  return { endpoints: new Map(), catalogs: new Set(), policies: new Map(), fetches: [], authConfigured: false, ...overrides };
}

describe('params-match rule', () => {
  it('no findings when all params match', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/data', { path: '/api/data', method: 'GET', params: { page: { type: 'int' }, search: { type: 'string' } }, source: 'api' }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/data', method: 'GET', queryParams: ['page', 'search'], bodyFields: [], rawUrl: '/api/data' },
    ];
    expect(paramsMatchRule.check(makeContext({ endpoints, fetches }))).toHaveLength(0);
  });

  it('warning when unknown param sent', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/data', { path: '/api/data', method: 'GET', params: { page: { type: 'int' } }, source: 'api' }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/data', method: 'GET', queryParams: ['page', 'unknownParam'], bodyFields: [], rawUrl: '/api/data' },
    ];
    const findings = paramsMatchRule.check(makeContext({ endpoints, fetches }));
    expect(findings).toHaveLength(1);
    expect(findings[0].level).toBe('warning');
    expect(findings[0].message).toContain('unknownParam');
  });

  it('suggests similar param names', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/data', { path: '/api/data', method: 'GET', params: { year: { type: 'int' }, month: { type: 'int' } }, source: 'api' }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/data', method: 'GET', queryParams: ['years'], bodyFields: [], rawUrl: '/api/data' },
    ];
    const findings = paramsMatchRule.check(makeContext({ endpoints, fetches }));
    expect(findings).toHaveLength(1);
    expect(findings[0].suggestion).toContain('year');
  });

  it('skips fetches with no matching endpoint', () => {
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/nonexistent', method: 'GET', queryParams: ['anything'], bodyFields: [], rawUrl: '' },
    ];
    expect(paramsMatchRule.check(makeContext({ fetches }))).toHaveLength(0);
  });

  it('skips pagination params (page, pageSize)', () => {
    const endpoints = new Map<string, EndpointInfo>([
      ['GET /api/data', { path: '/api/data', method: 'GET', params: { search: { type: 'string' } }, source: 'api' }],
    ]);
    const fetches: FetchReference[] = [
      { screen: 's1', path: '/api/data', method: 'GET', queryParams: ['search', 'page', 'pageSize'], bodyFields: [], rawUrl: '' },
    ];
    expect(paramsMatchRule.check(makeContext({ endpoints, fetches }))).toHaveLength(0);
  });
});
