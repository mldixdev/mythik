import { assertValidIdentifier } from './validation/identifier-guard.js';
import type { SqlDriver, SqlStatement } from 'mythik/server';

export function filterFields(body: Record<string, unknown>, allowedFields: string[]): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  const allowed = new Set(allowedFields);
  for (const [key, value] of Object.entries(body)) {
    if (allowed.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

export function buildInsertQuery(
  driver: SqlDriver,
  table: string,
  fields: Record<string, unknown>,
): { sql: string; params: Record<string, unknown> } {
  assertValidIdentifier(table, 'crud.table');
  const columns = Object.keys(fields);
  for (const col of columns) {
    assertValidIdentifier(col, 'crud field');
  }
  const statement = driver.buildInsertReturning(table, fields);
  return { sql: statement.sql, params: objectParams(statement) };
}

export function buildUpdateQuery(
  driver: SqlDriver,
  table: string,
  primaryKey: string,
  pkValue: unknown,
  fields: Record<string, unknown>,
  extraWhere?: SqlStatement,
): { sql: string; params: Record<string, unknown> } {
  assertValidIdentifier(table, 'crud.table');
  assertValidIdentifier(primaryKey, 'crud.primaryKey');
  for (const col of Object.keys(fields)) {
    assertValidIdentifier(col, 'crud field');
  }
  const statement = driver.buildUpdateReturning(table, fields, primaryKeyWhere(driver, primaryKey, pkValue, extraWhere));
  return { sql: statement.sql, params: objectParams(statement) };
}

export function buildDeleteQuery(
  driver: SqlDriver,
  table: string,
  primaryKey: string,
  pkValue: unknown,
  extraWhere?: SqlStatement,
): { sql: string; params: Record<string, unknown> } {
  assertValidIdentifier(table, 'crud.table');
  assertValidIdentifier(primaryKey, 'crud.primaryKey');
  const statement = driver.buildDelete(table, primaryKeyWhere(driver, primaryKey, pkValue, extraWhere));
  return { sql: statement.sql, params: objectParams(statement) };
}

export function buildSelectByPrimaryKeyQuery(
  driver: SqlDriver,
  table: string,
  primaryKey: string,
  pkValue: unknown,
  extraWhere?: SqlStatement,
): { sql: string; params: Record<string, unknown> } {
  assertValidIdentifier(table, 'crud.table');
  assertValidIdentifier(primaryKey, 'crud.primaryKey');
  const where = primaryKeyWhere(driver, primaryKey, pkValue, extraWhere);
  return {
    sql: `SELECT * FROM ${driver.quoteIdent(table)} ${where.sql}`,
    params: objectParams(where),
  };
}

function primaryKeyWhere(driver: SqlDriver, primaryKey: string, pkValue: unknown, extraWhere?: SqlStatement): SqlStatement {
  const params = { _pkValue: pkValue };
  if (extraWhere) {
    return {
      sql: `WHERE (${extraWhere.sql}) AND ${driver.quoteIdent(primaryKey)} = @_pkValue`,
      params: { ...objectParams(extraWhere), ...params },
    };
  }

  return {
    sql: `WHERE ${driver.quoteIdent(primaryKey)} = @_pkValue`,
    params,
  };
}

function objectParams(statement: SqlStatement): Record<string, unknown> {
  const params = statement.params;
  if (!params) return {};
  if (Array.isArray(params)) {
    throw new Error('CRUD statements require named object parameters.');
  }
  return params as Record<string, unknown>;
}
