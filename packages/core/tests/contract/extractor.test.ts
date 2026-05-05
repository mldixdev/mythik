import { describe, it, expect } from 'vitest';
import { extractFetchReferences } from '../../src/contract/extractor.js';

describe('extractFetchReferences', () => {
  it('extracts static URL from fetch action', () => {
    const screen = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn'] },
        btn: {
          type: 'touchable',
          on: {
            press: {
              action: 'fetch',
              params: {
                url: 'http://localhost:3010/api/records/v4?page=0&pageSize=50',
                method: 'GET',
                target: '/data',
              },
            },
          },
        },
      },
    };
    const refs = extractFetchReferences('test-screen', screen, 'http://localhost:3010');
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe('/api/records/v4');
    expect(refs[0].method).toBe('GET');
    expect(refs[0].queryParams).toContain('page');
    expect(refs[0].queryParams).toContain('pageSize');
    expect(refs[0].screen).toBe('test-screen');
  });

  it('extracts $template URL and resolves path params', () => {
    const screen = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn'] },
        btn: {
          type: 'touchable',
          on: {
            press: {
              action: 'fetch',
              params: {
                url: { '$template': 'http://localhost:3010/api/records/${/ui/selectedRow/id}' },
                method: 'PUT',
                body: { allocatedAmount: { '$state': '/form/pv' }, spentAmount: { '$state': '/form/d' } },
              },
            },
          },
        },
      },
    };
    const refs = extractFetchReferences('edit-screen', screen, 'http://localhost:3010');
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe('/api/records/:param');
    expect(refs[0].method).toBe('PUT');
    expect(refs[0].bodyFields).toEqual(['allocatedAmount', 'spentAmount']);
  });

  it('extracts from initialActions', () => {
    const screen = {
      root: 'page',
      initialActions: [
        { action: 'fetch', params: { url: 'http://localhost:3010/api/catalogs/years', method: 'GET', target: '/years' } },
        { action: 'fetch', params: { url: 'http://localhost:3010/api/catalogs/monthes', method: 'GET', target: '/monthes' } },
      ],
      elements: { page: { type: 'box' } },
    };
    const refs = extractFetchReferences('main', screen, 'http://localhost:3010');
    expect(refs).toHaveLength(2);
    expect(refs[0].path).toBe('/api/catalogs/years');
    expect(refs[1].path).toBe('/api/catalogs/monthes');
  });

  it('extracts from dataSources', () => {
    const screen = {
      root: 'page',
      dataSources: {
        tasks: {
          url: { '$template': 'http://localhost:3010/api/tasks?status=${/filter/status}' },
          method: 'GET',
          target: '/tasks',
        },
      },
      elements: { page: { type: 'box' } },
    };
    const refs = extractFetchReferences('tasks-screen', screen, 'http://localhost:3010');
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe('/api/tasks');
    expect(refs[0].queryParams).toContain('status');
  });

  it('extracts from submitForm action', () => {
    const screen = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn'] },
        btn: {
          type: 'touchable',
          on: {
            press: {
              action: 'submitForm',
              params: {
                url: 'http://localhost:3010/api/items',
                method: 'POST',
                body: { name: { '$state': '/form/name' } },
              },
            },
          },
        },
      },
    };
    const refs = extractFetchReferences('form', screen, 'http://localhost:3010');
    expect(refs).toHaveLength(1);
    expect(refs[0].method).toBe('POST');
    expect(refs[0].bodyFields).toEqual(['name']);
  });

  it('extracts from transaction confirm/onSuccess actions', () => {
    const screen = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn'] },
        btn: {
          type: 'touchable',
          on: {
            press: {
              action: 'transaction',
              params: {
                confirm: [
                  { action: 'fetch', params: { url: 'http://localhost:3010/api/items', method: 'POST', body: { name: 'test' } } },
                ],
                onSuccess: [
                  { action: 'fetch', params: { url: 'http://localhost:3010/api/items', method: 'GET', target: '/items' } },
                ],
              },
            },
          },
        },
      },
    };
    const refs = extractFetchReferences('tx-screen', screen, 'http://localhost:3010');
    expect(refs).toHaveLength(2);
  });

  it('handles action arrays (sequential actions)', () => {
    const screen = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn'] },
        btn: {
          type: 'touchable',
          on: {
            press: [
              { action: 'fetch', params: { url: 'http://localhost:3010/api/items', method: 'DELETE' } },
              { action: 'fetch', params: { url: 'http://localhost:3010/api/items', method: 'GET', target: '/items' } },
            ],
          },
        },
      },
    };
    const refs = extractFetchReferences('multi', screen, 'http://localhost:3010');
    expect(refs).toHaveLength(2);
    expect(refs[0].method).toBe('DELETE');
    expect(refs[1].method).toBe('GET');
  });

  it('defaults method to GET when not specified', () => {
    const screen = {
      root: 'page',
      initialActions: [
        { action: 'fetch', params: { url: 'http://localhost:3010/api/data', target: '/d' } },
      ],
      elements: { page: { type: 'box' } },
    };
    const refs = extractFetchReferences('s', screen, 'http://localhost:3010');
    expect(refs[0].method).toBe('GET');
  });

  it('normalizes template domain URL — http://${authDomain}/path', () => {
    const screen = {
      root: 'page',
      initialActions: [
        { action: 'fetch', params: { url: { '$template': 'http://${state.authDomain}/api/items' }, method: 'GET', target: '/d' } },
      ],
      elements: { page: { type: 'box' } },
    };
    const refs = extractFetchReferences('s1', screen);
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe('/api/items');
  });

  it('normalizes template domain URL with port — https://${apiUrl}:8080/path', () => {
    const screen = {
      root: 'page',
      initialActions: [
        { action: 'fetch', params: { url: { '$template': 'https://${config.apiUrl}:8080/api/data?status=${/filter/s}' }, method: 'GET', target: '/d' } },
      ],
      elements: { page: { type: 'box' } },
    };
    const refs = extractFetchReferences('s1', screen);
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe('/api/data');
    expect(refs[0].queryParams).toContain('status');
  });

  it('does NOT normalize path-only templates', () => {
    const screen = {
      root: 'page',
      initialActions: [
        { action: 'fetch', params: { url: 'http://localhost:3010/api/items/${/ui/id}', method: 'GET', target: '/d' } },
      ],
      elements: { page: { type: 'box' } },
    };
    const refs = extractFetchReferences('s1', screen, 'http://localhost:3010');
    expect(refs).toHaveLength(1);
    expect(refs[0].path).toBe('/api/items/:param');
  });
});
