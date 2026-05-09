import { describe, it, expect } from 'vitest';
import { createSqlDriver } from 'mythik/server';
import { buildCatalogQuery } from '../src/catalog-builder.js';

describe('buildCatalogQuery', () => {
  const sqlserver = createSqlDriver({ dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } });

  it('generates SQL for from + value + label', () => {
    const sql = buildCatalogQuery(sqlserver, { from: 'Organizations', value: 'organizationId', label: 'nombre' });
    expect(sql).toBe('SELECT [organizationId] AS [value], [nombre] AS [label] FROM [Organizations] ORDER BY [nombre] ASC');
  });

  it('generates SQL for distinct', () => {
    const sql = buildCatalogQuery(sqlserver, { from: 'SampleEvents', distinct: 'year', orderBy: 'year DESC' });
    expect(sql).toBe('SELECT DISTINCT [year] AS [value], [year] AS [label] FROM [SampleEvents] ORDER BY [year] DESC');
  });

  it('includes extra fields', () => {
    const sql = buildCatalogQuery(sqlserver, { from: 'CatalogEntries', value: 'id', label: 'nombre', extra: ['categoryType'] });
    expect(sql).toContain('[categoryType]');
    expect(sql).toContain('[id] AS [value]');
    expect(sql).toContain('[nombre] AS [label]');
  });

  it('applies where clause', () => {
    const sql = buildCatalogQuery(sqlserver, { from: 'Items', value: 'id', label: 'name', where: 'status = 1' });
    expect(sql).toContain('WHERE status = 1');
  });

  it('uses custom orderBy', () => {
    const sql = buildCatalogQuery(sqlserver, { from: 'Items', value: 'id', label: 'name', orderBy: 'id DESC' });
    expect(sql).toContain('ORDER BY [id] DESC');
  });

  it('defaults orderBy to label ASC', () => {
    const sql = buildCatalogQuery(sqlserver, { from: 'Items', value: 'id', label: 'name' });
    expect(sql).toContain('ORDER BY [name] ASC');
  });

  it('quotes generated catalog identifiers through the selected driver', () => {
    const sqlite = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });

    const sql = buildCatalogQuery(sqlite, {
      from: 'CatalogEntries',
      value: 'id',
      label: 'name',
      extra: ['categoryType'],
      orderBy: 'name DESC',
    });

    expect(sql).toBe(
      'SELECT "id" AS "value", "name" AS "label", "categoryType" FROM "CatalogEntries" ORDER BY "name" DESC',
    );
  });

  it('returns null for static catalogs', () => {
    const sql = buildCatalogQuery(sqlserver, { static: [{ label: 'Jan', value: '1' }] });
    expect(sql).toBeNull();
  });
});
