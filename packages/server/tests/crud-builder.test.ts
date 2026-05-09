import { describe, it, expect } from 'vitest';
import { createSqlDriver } from 'mythik/server';
import { buildInsertQuery, buildUpdateQuery, buildDeleteQuery, filterFields } from '../src/crud-builder.js';
import type { CrudConfig } from '../src/types.js';

const crud: CrudConfig = {
  table: 'SampleRecords',
  primaryKey: 'recordId',
  insertable: ['organizationId', 'categoryId', 'month', 'year', 'allocatedAmount'],
  updatable: ['allocatedAmount', 'adjustedAmount', 'committedAmount', 'spentAmount'],
};

describe('filterFields', () => {
  it('only keeps allowed fields from body', () => {
    const body = { organizationId: 1, categoryId: 2, hacked: 'malicious', allocatedAmount: 100 };
    const filtered = filterFields(body, crud.insertable);
    expect(filtered).toEqual({ organizationId: 1, categoryId: 2, allocatedAmount: 100 });
    expect(filtered).not.toHaveProperty('hacked');
  });

  it('returns empty object when no fields match', () => {
    const body = { unknown: 'value' };
    expect(filterFields(body, crud.insertable)).toEqual({});
  });
});

describe('buildInsertQuery', () => {
  it('generates SQL Server INSERT through the driver helper', () => {
    const driver = createSqlDriver({ dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } });
    const fields = { organizationId: 1, categoryId: 2, allocatedAmount: 100 };
    const { sql, params } = buildInsertQuery(driver, crud.table, fields);
    expect(sql).toContain('INSERT INTO [SampleRecords]');
    expect(sql).toContain('[organizationId]');
    expect(sql).toContain('@organizationId');
    expect(sql).toContain('OUTPUT INSERTED.*');
    expect(sql).not.toContain('SCOPE_IDENTITY()');
    expect(params).toEqual({ organizationId: 1, categoryId: 2, allocatedAmount: 100 });
  });

  it('generates SQLite INSERT through the driver helper', () => {
    const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });
    const fields = { name: 'test' };
    const { sql, params } = buildInsertQuery(driver, 'MyTable', fields);
    expect(sql).toBe('INSERT INTO "MyTable" ("name") VALUES (@name) RETURNING *');
    expect(params).toEqual({ name: 'test' });
  });

  it('generates MySQL INSERT without RETURNING', () => {
    const driver = createSqlDriver({ dialect: 'mysql', connection: 'mysql://localhost/mythik' });
    const fields = { name: 'test' };
    const { sql, params } = buildInsertQuery(driver, 'MyTable', fields);
    expect(sql).toBe('INSERT INTO `MyTable` (`name`) VALUES (@name)');
    expect(sql).not.toContain('RETURNING');
    expect(params).toEqual({ name: 'test' });
  });
});

describe('buildUpdateQuery', () => {
  it('generates UPDATE through the driver helper', () => {
    const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });
    const fields = { allocatedAmount: 200, spentAmount: 150 };
    const { sql, params } = buildUpdateQuery(driver, crud.table, crud.primaryKey, 42, fields);
    expect(sql).toContain('UPDATE "SampleRecords"');
    expect(sql).toContain('"allocatedAmount" = @set_allocatedAmount');
    expect(sql).toContain('"spentAmount" = @set_spentAmount');
    expect(sql).toContain('WHERE "recordId" = @_pkValue');
    expect(sql).toContain('RETURNING *');
    expect(params._pkValue).toBe(42);
  });

  it('builds scoped UPDATE without string replacement of WHERE', () => {
    const driver = createSqlDriver({ dialect: 'mysql', connection: 'mysql://localhost/mythik' });
    const fields = { allocatedAmount: 200 };
    const { sql, params } = buildUpdateQuery(
      driver,
      crud.table,
      crud.primaryKey,
      42,
      fields,
      { sql: '`organizationId` = @_scope0', params: { _scope0: 7 } },
    );
    expect(sql).toBe(
      'UPDATE `SampleRecords` SET `allocatedAmount` = @set_allocatedAmount WHERE (`organizationId` = @_scope0) AND `recordId` = @_pkValue',
    );
    expect(params).toMatchObject({ _scope0: 7, _pkValue: 42, set_allocatedAmount: 200 });
  });
});

describe('buildDeleteQuery', () => {
  it('generates DELETE through the driver helper', () => {
    const driver = createSqlDriver({ dialect: 'postgres', connection: { connectionString: 'postgres://localhost/mythik' } });
    const { sql, params } = buildDeleteQuery(driver, crud.table, crud.primaryKey, 42);
    expect(sql).toBe('DELETE FROM "SampleRecords" WHERE "recordId" = @_pkValue');
    expect(params._pkValue).toBe(42);
  });
});
