import { describe, it, expect } from 'vitest';
import { buildCatalogQuery } from '../src/catalog-builder.js';

describe('buildCatalogQuery', () => {
  it('generates SQL for from + value + label', () => {
    const sql = buildCatalogQuery({ from: 'Organizations', value: 'organizationId', label: 'nombre' });
    expect(sql).toBe('SELECT [organizationId] AS [value], [nombre] AS [label] FROM [Organizations] ORDER BY [nombre] ASC');
  });

  it('generates SQL for distinct', () => {
    const sql = buildCatalogQuery({ from: 'SampleEvents', distinct: 'year', orderBy: 'year DESC' });
    expect(sql).toBe('SELECT DISTINCT [year] AS [value], [year] AS [label] FROM [SampleEvents] ORDER BY [year] DESC');
  });

  it('includes extra fields', () => {
    const sql = buildCatalogQuery({ from: 'CatalogEntries', value: 'id', label: 'nombre', extra: ['categoryType'] });
    expect(sql).toContain('[categoryType]');
    expect(sql).toContain('[id] AS [value]');
    expect(sql).toContain('[nombre] AS [label]');
  });

  it('applies where clause', () => {
    const sql = buildCatalogQuery({ from: 'Items', value: 'id', label: 'name', where: 'status = 1' });
    expect(sql).toContain('WHERE status = 1');
  });

  it('uses custom orderBy', () => {
    const sql = buildCatalogQuery({ from: 'Items', value: 'id', label: 'name', orderBy: 'id DESC' });
    expect(sql).toContain('ORDER BY [id] DESC');
  });

  it('defaults orderBy to label ASC', () => {
    const sql = buildCatalogQuery({ from: 'Items', value: 'id', label: 'name' });
    expect(sql).toContain('ORDER BY [name] ASC');
  });

  it('returns null for static catalogs', () => {
    const sql = buildCatalogQuery({ static: [{ label: 'Jan', value: '1' }] });
    expect(sql).toBeNull();
  });
});
