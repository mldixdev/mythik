import { describe, it, expect } from 'vitest';
import { getDocumentHandler } from '../../src/spec-engine/handlers/index.js';

const sampleApiSpec = {
  type: 'api',
  name: 'Test API',
  catalogs: {
    departments: { from: 'Departments', value: 'id', label: 'name' },
    months: { static: [{ label: 'Jan', value: '1' }] },
  },
  endpoints: {
    list: { path: '/api/items', query: 'SELECT * FROM Items', pagination: 'offset' },
    crud: { path: '/api/items', crud: { table: 'Items', primaryKey: 'id', insertable: ['name'], updatable: ['name'] } },
    handler: { path: '/api/custom', handler: 'my-handler' },
  },
  auth: {
    strategy: 'jwt',
    policies: { admin: { roles: ['ADMIN'] } },
  },
};

describe('apiHandler — detect', () => {
  it('detects type: "api" specs', () => {
    const handler = getDocumentHandler(sampleApiSpec);
    expect(handler.type).toBe('api');
  });

  it('does not detect screen specs', () => {
    const handler = getDocumentHandler({ root: 'page', elements: { page: { type: 'box' } } });
    expect(handler.type).not.toBe('api');
  });

  it('does not detect app specs', () => {
    const appSpec = {
      type: 'app',
      layout: { root: 'app', elements: { app: { type: 'box' } } },
      screens: {},
      tokens: {},
    };
    const handler = getDocumentHandler(appSpec);
    expect(handler.type).toBe('app');
  });
});

describe('apiHandler — manifest', () => {
  it('generates manifest with catalogs and endpoints', () => {
    const handler = getDocumentHandler(sampleApiSpec);
    const manifest = handler.generateManifest(sampleApiSpec);
    expect(manifest).toContain('departments');
    expect(manifest).toContain('/api/items');
    expect(manifest).toContain('my-handler');
    expect(manifest).toContain('admin');
  });
});

describe('apiHandler — validate', () => {
  it('validates a valid api-spec', () => {
    const handler = getDocumentHandler(sampleApiSpec);
    const result = handler.validate(sampleApiSpec, {});
    expect(result.valid).toBe(true);
  });

  it('catches invalid identifiers', () => {
    const badSpec = {
      ...sampleApiSpec,
      catalogs: { bad: { from: 'DROP TABLE--', value: 'id', label: 'name' } },
    };
    const handler = getDocumentHandler(badSpec);
    const result = handler.validate(badSpec, {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('identifier');
  });
});

describe('apiHandler — getElements', () => {
  it('gets elements by dot-notation path', () => {
    const handler = getDocumentHandler(sampleApiSpec);
    const result = handler.getElements(sampleApiSpec, ['endpoints.list']);
    expect(result.found['endpoints.list']).toBeDefined();
    expect((result.found['endpoints.list'] as Record<string, unknown>).path).toBe('/api/items');
  });

  it('gets catalogs section', () => {
    const handler = getDocumentHandler(sampleApiSpec);
    const result = handler.getElements(sampleApiSpec, ['catalogs']);
    expect(result.found['catalogs']).toBeDefined();
  });

  it('reports notFound for missing paths', () => {
    const handler = getDocumentHandler(sampleApiSpec);
    const result = handler.getElements(sampleApiSpec, ['catalogs.nonexistent']);
    expect(result.notFound).toContain('catalogs.nonexistent');
  });
});

describe('apiHandler — countElements', () => {
  it('counts endpoints + catalogs', () => {
    const handler = getDocumentHandler(sampleApiSpec);
    const count = handler.countElements(sampleApiSpec);
    expect(count).toBe(5); // 2 catalogs + 3 endpoints
  });
});

describe('apiHandler — extractPatchedPaths', () => {
  it('extracts patched sections', () => {
    const handler = getDocumentHandler(sampleApiSpec);
    const result = handler.extractPatchedPaths([
      { op: 'replace', path: '/catalogs/departments/orderBy', value: 'name' },
      { op: 'replace', path: '/endpoints/list/query', value: 'SELECT 1' },
    ]);
    expect(result.sections).toContain('catalogs');
    expect(result.sections).toContain('endpoints');
    expect(result.elements).toEqual([]);
  });
});
