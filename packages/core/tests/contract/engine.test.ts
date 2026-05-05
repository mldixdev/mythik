import { describe, it, expect } from 'vitest';
import { runContract } from '../../src/contract/engine.js';

describe('runContract', () => {
  it('full integration — valid contract', () => {
    const app = {
      type: 'app',
      navigation: {
        auth: { roleAccess: { ADMIN: ['*'], EDITOR: ['dashboard'] } },
        menu: ['dashboard'],
      },
      screens: { dashboard: { label: 'Dashboard' } },
    };
    const screens = {
      dashboard: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: 'http://localhost:3010/api/catalogs/years', method: 'GET', target: '/a' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [{
      id: 'main-api',
      spec: {
        type: 'api',
        catalogs: { years: { from: 'Table', distinct: 'year' } },
        auth: { policies: { admin: { roles: ['ADMIN'] } } },
      },
    }];

    const result = runContract({
      app: app as Record<string, unknown>,
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
      baseUrl: 'http://localhost:3010',
    });

    expect(result.valid).toBe(true);
    expect(result.findings).toHaveLength(0);
    expect(result.summary.screens).toBe(1);
    expect(result.summary.fetchReferences).toBe(1);
  });

  it('full integration — detects missing endpoint', () => {
    const screens = {
      s1: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: 'http://localhost:3010/api/nonexistent', method: 'GET', target: '/d' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [{ id: 'api', spec: { type: 'api' } }];

    const result = runContract({
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
      baseUrl: 'http://localhost:3010',
    });

    expect(result.valid).toBe(false);
    expect(result.summary.errors).toBe(1);
  });

  it('supports multiple api-specs', () => {
    const screens = {
      s1: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: 'http://localhost:3010/api/catalogs/cats', method: 'GET', target: '/c' } },
          { action: 'fetch', params: { url: 'http://localhost:3010/api/catalogs/roles', method: 'GET', target: '/r' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [
      { id: 'api1', spec: { type: 'api', catalogs: { cats: { from: 'C', value: 'id', label: 'name' } } } },
      { id: 'api2', spec: { type: 'api', catalogs: { roles: { from: 'R', value: 'id', label: 'name' } } } },
    ];

    const result = runContract({
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
      baseUrl: 'http://localhost:3010',
    });

    expect(result.valid).toBe(true);
    expect(result.summary.fetchReferences).toBe(2);
  });

  it('detects permission inconsistency', () => {
    const app = {
      type: 'app',
      navigation: {
        auth: { roleAccess: { ADMIN: ['*'], VIEWER: ['admin-panel'] } },
      },
      screens: { 'admin-panel': { label: 'Admin' } },
    };
    const screens = {
      'admin-panel': {
        root: 'page',
        elements: {
          page: { type: 'box', children: ['btn'] },
          btn: {
            type: 'touchable',
            on: {
              press: { action: 'fetch', params: { url: 'http://localhost:3010/api/admin/delete', method: 'DELETE' } },
            },
          },
        },
      },
    };
    const apis = [{
      id: 'api',
      spec: {
        type: 'api',
        endpoints: { adminDelete: { path: '/api/admin/delete', method: 'DELETE', handler: 'admin-delete', policy: 'admin' } },
        auth: { policies: { admin: { roles: ['ADMIN'] } } },
      },
    }];

    const result = runContract({
      app: app as Record<string, unknown>,
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
      baseUrl: 'http://localhost:3010',
    });

    expect(result.summary.warnings).toBeGreaterThan(0);
    const permFinding = result.findings.find(f => f.rule === 'permissions-consistent');
    expect(permFinding).toBeDefined();
    expect(permFinding!.message).toContain('VIEWER');
  });

  it('deduplicates identical findings within same screen', () => {
    const screens = {
      s1: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: '/api/missing', method: 'GET', target: '/a' } },
          { action: 'fetch', params: { url: '/api/missing', method: 'GET', target: '/b' } },
          { action: 'fetch', params: { url: '/api/missing', method: 'GET', target: '/c' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [{ id: 'api', spec: { type: 'api' } }];

    const result = runContract({
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
    });

    // 3 fetches to same missing endpoint → 1 finding with count 3
    const endpointFindings = result.findings.filter(f => f.rule === 'endpoints-exist');
    expect(endpointFindings).toHaveLength(1);
    expect(endpointFindings[0].count).toBe(3);
    expect(result.summary.errors).toBe(1);
  });

  it('does NOT deduplicate findings across different screens', () => {
    const screens = {
      s1: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: '/api/missing', method: 'GET', target: '/a' } },
        ],
        elements: { page: { type: 'box' } },
      },
      s2: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: '/api/missing', method: 'GET', target: '/a' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [{ id: 'api', spec: { type: 'api' } }];

    const result = runContract({
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
    });

    const endpointFindings = result.findings.filter(f => f.rule === 'endpoints-exist');
    expect(endpointFindings).toHaveLength(2); // one per screen
    expect(result.summary.errors).toBe(2);
  });

  it('does NOT deduplicate genuinely different findings', () => {
    const screens = {
      s1: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: '/api/missing-a', method: 'GET', target: '/a' } },
          { action: 'fetch', params: { url: '/api/missing-b', method: 'GET', target: '/b' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [{ id: 'api', spec: { type: 'api' } }];

    const result = runContract({
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
    });

    expect(result.findings.filter(f => f.rule === 'endpoints-exist')).toHaveLength(2);
    expect(result.summary.errors).toBe(2);
  });

  it('warns when absolute URLs detected without baseUrl', () => {
    const screens = {
      s1: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: 'http://localhost:3010/api/items', method: 'GET', target: '/d' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [{ id: 'api', spec: { type: 'api', endpoints: { items: { path: '/api/items', method: 'GET', handler: 'h' } } } }];

    const result = runContract({
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
    });

    const warning = result.findings.find(f => f.rule === 'contract');
    expect(warning).toBeDefined();
    expect(warning!.level).toBe('warning');
    expect(warning!.message).toContain('--base-url');
  });

  it('does NOT warn when baseUrl is provided', () => {
    const screens = {
      s1: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: 'http://localhost:3010/api/items', method: 'GET', target: '/d' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [{ id: 'api', spec: { type: 'api', endpoints: { items: { path: '/api/items', method: 'GET', handler: 'h' } } } }];

    const result = runContract({
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
      baseUrl: 'http://localhost:3010',
    });

    const warning = result.findings.find(f => f.rule === 'contract');
    expect(warning).toBeUndefined();
  });

  it('does NOT warn when all URLs are relative', () => {
    const screens = {
      s1: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: '/api/items', method: 'GET', target: '/d' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [{ id: 'api', spec: { type: 'api', endpoints: { items: { path: '/api/items', method: 'GET', handler: 'h' } } } }];

    const result = runContract({
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
    });

    const warning = result.findings.find(f => f.rule === 'contract');
    expect(warning).toBeUndefined();
  });

  it('does NOT warn for template domain URLs without baseUrl', () => {
    const screens = {
      s1: {
        root: 'page',
        initialActions: [
          { action: 'fetch', params: { url: { '$template': 'http://${state.authDomain}/api/items' }, method: 'GET', target: '/d' } },
        ],
        elements: { page: { type: 'box' } },
      },
    };
    const apis = [{ id: 'api', spec: { type: 'api', endpoints: { items: { path: '/api/items', method: 'GET', handler: 'h' } } } }];

    const result = runContract({
      screens: screens as Record<string, Record<string, unknown>>,
      apis,
    });

    const warning = result.findings.find(f => f.rule === 'contract');
    expect(warning).toBeUndefined();
  });
});
