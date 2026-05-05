import { describe, it, expect } from 'vitest';
import {
  buildPaginatedQuery,
  buildCountQuery,
  buildTotalsQuery,
  parseParamValue,
} from '../src/query-engine.js';

describe('parseParamValue', () => {
  it('converts string to int', () => {
    expect(parseParamValue('42', 'int')).toBe(42);
  });

  it('converts string to float', () => {
    expect(parseParamValue('3.14', 'float')).toBe(3.14);
  });

  it('keeps string as string', () => {
    expect(parseParamValue('hello', 'string')).toBe('hello');
  });

  it('converts string to boolean', () => {
    expect(parseParamValue('true', 'boolean')).toBe(true);
    expect(parseParamValue('false', 'boolean')).toBe(false);
  });

  it('returns null for undefined/empty optional params', () => {
    expect(parseParamValue(undefined, 'int')).toBeNull();
    expect(parseParamValue('', 'int')).toBeNull();
  });

  it('clamps int value to max when specified', () => {
    expect(parseParamValue('500', 'int', 200)).toBe(200);
    expect(parseParamValue('100', 'int', 200)).toBe(100);
  });

  it('returns null for NaN int', () => {
    expect(parseParamValue('abc', 'int')).toBeNull();
  });

  it('returns null for NaN float', () => {
    expect(parseParamValue('abc', 'float')).toBeNull();
  });

  it('passes date as string', () => {
    expect(parseParamValue('2026-04-06', 'date')).toBe('2026-04-06');
  });
});

describe('buildPaginatedQuery', () => {
  const baseQuery = 'SELECT e.*, i.nombre FROM SampleEvents e LEFT JOIN Organizations i ON e.organizationId = i.organizationId WHERE e.year = @year ORDER BY e.year DESC';

  it('appends parameterized OFFSET/FETCH NEXT to query', () => {
    const result = buildPaginatedQuery(baseQuery);
    expect(result).toContain('OFFSET @_offset ROWS');
    expect(result).toContain('FETCH NEXT @_pageSize ROWS ONLY');
  });

  it('preserves original query structure', () => {
    const result = buildPaginatedQuery(baseQuery);
    expect(result).toContain('SELECT e.*, i.nombre');
    expect(result).toContain('LEFT JOIN');
    expect(result).toContain('WHERE e.year = @year');
    expect(result).toContain('ORDER BY e.year DESC');
  });
});

describe('buildCountQuery', () => {
  it('strips SELECT columns and ORDER BY, wraps in COUNT(*)', () => {
    const sql = 'SELECT e.id, e.nombre, i.label FROM SampleEvents e LEFT JOIN Organizations i ON e.id = i.id WHERE e.year = @year ORDER BY e.nombre DESC';
    const count = buildCountQuery(sql);
    expect(count).toContain('SELECT COUNT(*) as _total');
    expect(count).toContain('FROM SampleEvents e LEFT JOIN Organizations i ON e.id = i.id');
    expect(count).toContain('WHERE e.year = @year');
    expect(count).not.toContain('ORDER BY');
    expect(count).not.toContain('e.id, e.nombre');
  });

  it('handles query without ORDER BY', () => {
    const sql = 'SELECT id FROM items WHERE active = 1';
    const count = buildCountQuery(sql);
    expect(count).toContain('SELECT COUNT(*) as _total');
    expect(count).toContain('FROM items');
    expect(count).toContain('WHERE active = 1');
  });

  it('handles multi-line queries', () => {
    const sql = `SELECT
      e.id,
      e.nombre
    FROM SampleEvents e
    WHERE e.year = @year
    ORDER BY e.nombre`;
    const count = buildCountQuery(sql);
    expect(count).toContain('SELECT COUNT(*) as _total');
    expect(count).toContain('FROM SampleEvents e');
    expect(count).not.toContain('ORDER BY');
  });
});

describe('buildTotalsQuery', () => {
  it('replaces SELECT columns with aggregations', () => {
    const sql = 'SELECT e.id, e.allocatedAmount, e.spentAmount FROM SampleEvents e WHERE e.year = @year ORDER BY e.id';
    const totals = buildTotalsQuery(sql, ['SUM:allocatedAmount', 'SUM:spentAmount', 'COUNT:*']);
    expect(totals).toContain('SUM(allocatedAmount) as [SUM:allocatedAmount]');
    expect(totals).toContain('SUM(spentAmount) as [SUM:spentAmount]');
    expect(totals).toContain('COUNT(*) as [COUNT:*]');
    expect(totals).toContain('FROM SampleEvents e');
    expect(totals).toContain('WHERE e.year = @year');
    expect(totals).not.toContain('ORDER BY');
  });

  it('handles COUNT_DISTINCT', () => {
    const sql = 'SELECT e.id FROM items e ORDER BY e.id';
    const totals = buildTotalsQuery(sql, ['COUNT_DISTINCT:organizationId']);
    expect(totals).toContain('COUNT(DISTINCT organizationId) as [COUNT_DISTINCT:organizationId]');
  });

  it('returns null for empty totals array', () => {
    const result = buildTotalsQuery('SELECT 1', []);
    expect(result).toBeNull();
  });
});
