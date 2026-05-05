import { describe, it, expect } from 'vitest';
import { apiHandler } from '../src/api-handler.js';
import type { ApiSpec } from '../src/types.js';

const testSpec: ApiSpec = {
  type: 'api',
  name: 'Test API',
  catalogs: {
    years: { from: 'Records', distinct: 'year', orderBy: 'year DESC' },
    categorys: { from: 'CatalogEntries', value: 'id', label: 'nombre', extra: ['categoryType'] },
    monthes: { static: [{ label: 'Enero', value: '1' }, { label: 'Febrero', value: '2' }] },
  },
  endpoints: {
    records: { path: '/api/records', query: 'SELECT * FROM data', pagination: 'offset', totals: ['SUM:amount', 'COUNT:*'] },
    copiar: { path: '/api/periodos/:id/copiar', method: 'POST', handler: 'copiar-month' },
  },
};

describe('apiHandler.detect', () => {
  it('recognizes ApiSpec by type: "api"', () => {
    expect(apiHandler.detect(testSpec)).toBe(true);
  });

  it('rejects screen spec', () => {
    expect(apiHandler.detect({ root: 'page', elements: {} })).toBe(false);
  });

  it('rejects app spec', () => {
    expect(apiHandler.detect({ type: 'app' })).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(apiHandler.detect(null)).toBe(false);
    expect(apiHandler.detect(undefined)).toBe(false);
  });
});

describe('apiHandler.generateManifest', () => {
  it('includes API name and counts', () => {
    const manifest = apiHandler.generateManifest(testSpec);
    expect(manifest).toContain('api: Test API');
    expect(manifest).toContain('3 catalogs');
    expect(manifest).toContain('2 endpoints');
    expect(manifest).toContain('1 handlers');
  });

  it('shows catalog details', () => {
    const manifest = apiHandler.generateManifest(testSpec);
    expect(manifest).toContain('years');
    expect(manifest).toContain('distinct: year');
    expect(manifest).toContain('categorys');
    expect(manifest).toContain('id → nombre');
    expect(manifest).toContain('+extra: categoryType');
    expect(manifest).toContain('monthes');
    expect(manifest).toContain('static (2 items)');
  });

  it('shows endpoint details', () => {
    const manifest = apiHandler.generateManifest(testSpec);
    expect(manifest).toContain('/api/records');
    expect(manifest).toContain('query');
    expect(manifest).toContain('pagination: offset');
    expect(manifest).toContain('totals: 2');
    expect(manifest).toContain('copiar-month');
  });

});

describe('apiHandler.getElements', () => {
  it('resolves dot-notation paths', () => {
    const result = apiHandler.getElements(testSpec, ['catalogs.years', 'endpoints.records']);
    expect(result.found['catalogs.years']).toBeDefined();
    expect(result.found['endpoints.records']).toBeDefined();
    expect(result.notFound).toEqual([]);
  });

  it('reports notFound for missing paths', () => {
    const result = apiHandler.getElements(testSpec, ['catalogs.missing', 'endpoints.nonexistent']);
    expect(result.notFound).toEqual(['catalogs.missing', 'endpoints.nonexistent']);
  });

  it('resolves nested catalog fields', () => {
    const result = apiHandler.getElements(testSpec, ['catalogs.categorys']);
    const categorys = result.found['catalogs.categorys'] as Record<string, unknown>;
    expect(categorys.from).toBe('CatalogEntries');
    expect(categorys.value).toBe('id');
  });
});

describe('apiHandler.validate', () => {
  it('valid spec passes', () => {
    const result = apiHandler.validate(testSpec, {});
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects invalid spec', () => {
    const bad = { ...testSpec, catalogs: { bad: { from: 'DROP TABLE--', value: 'id', label: 'name' } } };
    const result = apiHandler.validate(bad, {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('identifier');
  });
});

describe('apiHandler.extractPatchedPaths', () => {
  it('extracts patched sections', () => {
    const patches = [
      { op: 'replace' as const, path: '/catalogs/years/orderBy', value: 'year ASC' },
      { op: 'replace' as const, path: '/endpoints/records/query', value: 'SELECT 1' },
      { op: 'replace' as const, path: '/auth/strategy', value: 'jwt' },
    ];
    const result = apiHandler.extractPatchedPaths(patches);
    expect(result.sections).toContain('catalogs');
    expect(result.sections).toContain('endpoints');
    expect(result.sections).toContain('auth');
    expect(result.elements).toEqual([]);
  });

  it('ignores unknown top-level paths', () => {
    const patches = [{ op: 'add' as const, path: '/unknown/field', value: 'x' }];
    const result = apiHandler.extractPatchedPaths(patches);
    expect(result.sections).toEqual([]);
  });
});

describe('apiHandler.countElements', () => {
  it('returns 0 (API specs have no layout elements)', () => {
    expect(apiHandler.countElements(testSpec)).toBe(0);
  });
});
