import { describe, it, expect } from 'vitest';
import {
  buildPaginatedQuery,
  buildCountQuery,
  buildEndpointCountQuery,
  buildTotalsQuery,
  parseParamValue,
} from '../src/query-engine.js';
import { SCOPE_ALIAS, buildScopeWhereClause } from '../src/auth/scope-filter.js';
import { createSqlDriver } from 'mythik/server';

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

  it('uses SQL Server driver pagination when explicitly provided', () => {
    const sqlserver = createSqlDriver({ dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } });

    const result = buildPaginatedQuery(baseQuery, { driver: sqlserver, limit: 20, offset: 40 });
    expect(result).toContain('OFFSET 40 ROWS');
    expect(result).toContain('FETCH NEXT 20 ROWS ONLY');
  });

  it('preserves original query structure', () => {
    const sqlserver = createSqlDriver({ dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } });

    const result = buildPaginatedQuery(baseQuery, { driver: sqlserver, limit: 20, offset: 40 });
    expect(result).toContain('SELECT e.*, i.nombre');
    expect(result).toContain('LEFT JOIN');
    expect(result).toContain('WHERE e.year = @year');
    expect(result).toContain('ORDER BY e.year DESC');
  });

  it('uses driver pagination when driver and numeric bounds are provided', () => {
    const sqlite = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });
    const sqlserver = createSqlDriver({ dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } });

    expect(buildPaginatedQuery('SELECT * FROM screens', { driver: sqlite, limit: 10, offset: 20 })).toBe(
      'SELECT * FROM screens ORDER BY 1 LIMIT 10 OFFSET 20',
    );
    expect(buildPaginatedQuery('SELECT * FROM [screens] ORDER BY [id]', { driver: sqlserver, limit: 10, offset: 20 })).toBe(
      'SELECT * FROM [screens] ORDER BY [id] OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY',
    );
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

  it('counts scoped pagination sources after applying the scope filter', () => {
    const sql = 'SELECT o.id, o.mecanico, o.fecha FROM OrdenesTrabajo o ORDER BY o.fecha DESC';
    const scopeClause = buildScopeWhereClause(
      {
        claim: 'scope',
        column: 'mecanico',
        type: 'int',
        bypassRoles: ['ADMIN'],
      },
      [7],
      undefined,
      ['USER'],
    )!;

    const count = buildCountQuery(sql, { scopeClause });

    expect(count).toContain('SELECT COUNT(*) as _total FROM (');
    expect(count).toContain('SELECT * FROM (');
    expect(count).toContain('SELECT o.id, o.mecanico, o.fecha FROM OrdenesTrabajo o');
    expect(count).toContain(`WHERE ${SCOPE_ALIAS}.mecanico IN (@_scope0)`);
    expect(count).not.toContain('ORDER BY');
    expect(count).not.toMatch(/SELECT \* FROM \(\s*SELECT COUNT\(\*\) as _total/i);
  });
});

describe('buildEndpointCountQuery', () => {
  it('uses driver count query for simple unscoped counts', () => {
    const sqlite = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });

    expect(buildEndpointCountQuery('SELECT * FROM screens ORDER BY id', { driver: sqlite })).toBe(
      'SELECT COUNT(*) AS total FROM (SELECT * FROM screens ORDER BY id) AS _mythik_count',
    );
  });

  it('uses generated scoped counts for generated endpoint totals', () => {
    const source = 'SELECT o.id, o.mecanico FROM OrdenesTrabajo o ORDER BY o.id';
    const scopeClause = buildScopeWhereClause(
      {
        claim: 'scope',
        column: 'mecanico',
        type: 'int',
      },
      [7],
      undefined,
      ['USER'],
    )!;

    const count = buildEndpointCountQuery(source, { scopeClause });

    expect(count).toContain('SELECT COUNT(*) as _total FROM (');
    expect(count).toContain(`WHERE ${SCOPE_ALIAS}.mecanico IN (@_scope0)`);
  });

  it('expands custom count scopeAnd macros without wrapping after aggregation', () => {
    const source = 'SELECT o.id, o.mecanico FROM OrdenesTrabajo o ORDER BY o.id';
    const customCount = "SELECT COUNT(*) as _total FROM OrdenesTrabajo o WHERE o.estado = 'activo' {{scopeAnd:o}}";
    const scopeClause = buildScopeWhereClause(
      {
        claim: 'scope',
        column: 'mecanico',
        type: 'int',
      },
      [7],
      undefined,
      ['USER'],
    )!;

    const count = buildEndpointCountQuery(source, { customCount, scopeClause });

    expect(count).toBe("SELECT COUNT(*) as _total FROM OrdenesTrabajo o WHERE o.estado = 'activo' AND o.mecanico IN (@_scope0)");
    expect(count).not.toContain(`AS ${SCOPE_ALIAS}`);
  });

  it('removes custom count scope macros for bypass roles', () => {
    const source = 'SELECT o.id, o.mecanico FROM OrdenesTrabajo o ORDER BY o.id';
    const customCount = "SELECT COUNT(*) as _total FROM OrdenesTrabajo o WHERE o.estado = 'activo' {{scopeAnd:o}}";

    const count = buildEndpointCountQuery(source, { customCount, scopeClause: null });

    expect(count).toBe("SELECT COUNT(*) as _total FROM OrdenesTrabajo o WHERE o.estado = 'activo'");
    expect(count).not.toContain('{{scopeAnd');
    expect(count).not.toContain('@_scope');
  });

  it('expands custom count scopeWhere macros for select mode', () => {
    const source = 'SELECT o.id, o.clinicId FROM Orders o ORDER BY o.id';
    const customCount = 'SELECT COUNT(*) as _total FROM Orders o {{scopeWhere:o}}';
    const scopeClause = buildScopeWhereClause(
      {
        claim: 'clinics',
        column: 'clinicId',
        type: 'int',
        mode: 'select',
        header: 'X-Active-Scope',
      },
      [2, 5],
      5,
      ['USER'],
    )!;

    const count = buildEndpointCountQuery(source, { customCount, scopeClause });

    expect(count).toBe('SELECT COUNT(*) as _total FROM Orders o WHERE o.clinicId = @_activeScope');
  });

  it('preserves custom count ORDER BY clauses while rendering scope macros', () => {
    const source = 'SELECT o.id, o.mecanico FROM OrdenesTrabajo o ORDER BY o.id';
    const customCount = `SELECT COUNT(*) as _total FROM (
      SELECT TOP 100 o.id, o.mecanico
      FROM OrdenesTrabajo o
      ORDER BY o.priority DESC
    ) ranked WHERE ranked.id IS NOT NULL {{scopeAnd:ranked}}`;
    const scopeClause = buildScopeWhereClause(
      {
        claim: 'scope',
        column: 'mecanico',
        type: 'int',
      },
      [7],
      undefined,
      ['USER'],
    )!;

    const count = buildEndpointCountQuery(source, { customCount, scopeClause });

    expect(count).toContain('ORDER BY o.priority DESC');
    expect(count).toContain(') ranked WHERE ranked.id IS NOT NULL AND ranked.mecanico IN (@_scope0)');
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

  it('quotes total aliases through the driver when provided', () => {
    const sqlite = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });

    const totals = buildTotalsQuery('SELECT amount FROM invoices', ['SUM:amount', 'COUNT:*'], { driver: sqlite });

    expect(totals).toContain('SUM(amount) as "SUM:amount"');
    expect(totals).toContain('COUNT(*) as "COUNT:*"');
  });

  it('returns null for empty totals array', () => {
    const result = buildTotalsQuery('SELECT 1', []);
    expect(result).toBeNull();
  });
});
