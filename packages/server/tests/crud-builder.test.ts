import { describe, it, expect } from 'vitest';
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
  it('generates INSERT with parameterized values and SELECT back', () => {
    const fields = { organizationId: 1, categoryId: 2, allocatedAmount: 100 };
    const { sql, params } = buildInsertQuery(crud.table, fields, crud.primaryKey);
    expect(sql).toContain('INSERT INTO [SampleRecords]');
    expect(sql).toContain('[organizationId]');
    expect(sql).toContain('@organizationId');
    expect(sql).not.toContain('OUTPUT'); // trigger-safe: no OUTPUT clause
    expect(sql).toContain('SCOPE_IDENTITY()'); // returns inserted row
    expect(params).toEqual({ organizationId: 1, categoryId: 2, allocatedAmount: 100 });
  });

  it('generates INSERT without SELECT back when no primaryKey', () => {
    const fields = { name: 'test' };
    const { sql } = buildInsertQuery('MyTable', fields);
    expect(sql).not.toContain('SCOPE_IDENTITY');
    expect(sql).toContain('INSERT INTO [MyTable]');
  });
});

describe('buildUpdateQuery', () => {
  it('generates UPDATE with SET and WHERE on primary key', () => {
    const fields = { allocatedAmount: 200, spentAmount: 150 };
    const { sql, params } = buildUpdateQuery(crud.table, crud.primaryKey, 42, fields);
    expect(sql).toContain('UPDATE [SampleRecords]');
    expect(sql).toContain('[allocatedAmount] = @allocatedAmount');
    expect(sql).toContain('[spentAmount] = @spentAmount');
    expect(sql).toContain('WHERE [recordId] = @_pkValue');
    expect(sql).toContain('SELECT * FROM'); // trigger-safe: SELECT after UPDATE
    expect(params._pkValue).toBe(42);
  });
});

describe('buildDeleteQuery', () => {
  it('generates DELETE with WHERE on primary key', () => {
    const { sql, params } = buildDeleteQuery(crud.table, crud.primaryKey, 42);
    expect(sql).toContain('DELETE FROM [SampleRecords]');
    expect(sql).toContain('WHERE [recordId] = @_pkValue');
    expect(params._pkValue).toBe(42);
  });
});
