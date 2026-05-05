import { describe, it, expect } from 'vitest';
import { buildEndpointMap } from '../../src/contract/endpoint-map.js';

describe('buildEndpointMap', () => {
  it('builds map from single api-spec with query endpoint', () => {
    const apiSpec = {
      type: 'api',
      endpoints: {
        list: { path: '/api/items', query: 'SELECT * FROM items', params: { page: { type: 'int' } } },
      },
    };
    const { endpoints } = buildEndpointMap([{ id: 'items-api', spec: apiSpec }]);
    expect(endpoints.get('GET /api/items')).toBeDefined();
    expect(endpoints.get('GET /api/items')!.params.page.type).toBe('int');
    expect(endpoints.get('GET /api/items')!.source).toBe('items-api');
  });

  it('builds map from crud endpoint — generates POST, PUT, DELETE', () => {
    const apiSpec = {
      type: 'api',
      endpoints: {
        items: {
          path: '/api/items',
          crud: { table: 'Items', primaryKey: 'id', insertable: ['name', 'price'], updatable: ['name'] },
          policy: 'admin',
        },
      },
    };
    const { endpoints } = buildEndpointMap([{ id: 'api', spec: apiSpec }]);
    expect(endpoints.get('POST /api/items')).toBeDefined();
    expect(endpoints.get('POST /api/items')!.crud!.insertable).toEqual(['name', 'price']);
    expect(endpoints.get('PUT /api/items/:id')).toBeDefined();
    expect(endpoints.get('PUT /api/items/:id')!.crud!.updatable).toEqual(['name']);
    expect(endpoints.get('DELETE /api/items/:id')).toBeDefined();
    expect(endpoints.get('DELETE /api/items/:id')!.policy).toBe('admin');
  });

  it('collects catalogs', () => {
    const apiSpec = {
      type: 'api',
      catalogs: {
        years: { from: 'Table', distinct: 'year' },
        monthes: { static: [{ label: 'Ene', value: '1' }] },
      },
    };
    const { catalogs } = buildEndpointMap([{ id: 'api', spec: apiSpec }]);
    expect(catalogs.has('years')).toBe(true);
    expect(catalogs.has('monthes')).toBe(true);
  });

  it('collects policies', () => {
    const apiSpec = {
      type: 'api',
      auth: {
        policies: {
          admin: { roles: ['ADMIN'] },
          records: { roles: ['ADMIN', 'EDITOR'] },
        },
      },
    };
    const { policies } = buildEndpointMap([{ id: 'api', spec: apiSpec }]);
    expect(policies.get('admin')!.roles).toEqual(['ADMIN']);
    expect(policies.get('records')!.roles).toEqual(['ADMIN', 'EDITOR']);
  });

  it('merges multiple api-specs', () => {
    const spec1 = {
      type: 'api',
      endpoints: { items: { path: '/api/items', query: 'SELECT 1' } },
      catalogs: { cats: { from: 'Cats', value: 'id', label: 'name' } },
    };
    const spec2 = {
      type: 'api',
      endpoints: { users: { path: '/api/users', query: 'SELECT 1' } },
      catalogs: { roles: { from: 'Roles', value: 'id', label: 'name' } },
    };
    const { endpoints, catalogs } = buildEndpointMap([
      { id: 'items-api', spec: spec1 },
      { id: 'users-api', spec: spec2 },
    ]);
    expect(endpoints.has('GET /api/items')).toBe(true);
    expect(endpoints.has('GET /api/users')).toBe(true);
    expect(endpoints.get('GET /api/items')!.source).toBe('items-api');
    expect(endpoints.get('GET /api/users')!.source).toBe('users-api');
    expect(catalogs.has('cats')).toBe(true);
    expect(catalogs.has('roles')).toBe(true);
  });
});
