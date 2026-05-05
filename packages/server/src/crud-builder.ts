import { assertValidIdentifier } from './validation/identifier-guard.js';

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
  table: string,
  fields: Record<string, unknown>,
  primaryKey?: string,
): { sql: string; params: Record<string, unknown> } {
  assertValidIdentifier(table, 'crud.table');
  const columns = Object.keys(fields);
  for (const col of columns) {
    assertValidIdentifier(col, 'crud field');
  }
  const columnsList = columns.map(c => `[${c}]`).join(', ');
  const paramsList = columns.map(c => `@${c}`).join(', ');

  // Trigger-safe: INSERT + SELECT back by SCOPE_IDENTITY() instead of OUTPUT INSERTED.*
  const selectBack = primaryKey
    ? `; SELECT * FROM [${table}] WHERE [${primaryKey}] = SCOPE_IDENTITY()`
    : '';
  const sql = `INSERT INTO [${table}] (${columnsList}) VALUES (${paramsList})${selectBack}`;
  return { sql, params: { ...fields } };
}

export function buildUpdateQuery(
  table: string,
  primaryKey: string,
  pkValue: unknown,
  fields: Record<string, unknown>,
): { sql: string; params: Record<string, unknown> } {
  assertValidIdentifier(table, 'crud.table');
  assertValidIdentifier(primaryKey, 'crud.primaryKey');
  for (const col of Object.keys(fields)) {
    assertValidIdentifier(col, 'crud field');
  }
  const setClauses = Object.keys(fields).map(c => `[${c}] = @${c}`).join(', ');

  const sql = `UPDATE [${table}] SET ${setClauses} WHERE [${primaryKey}] = @_pkValue; SELECT * FROM [${table}] WHERE [${primaryKey}] = @_pkValue`;
  return { sql, params: { ...fields, _pkValue: pkValue } };
}

export function buildDeleteQuery(
  table: string,
  primaryKey: string,
  pkValue: unknown,
): { sql: string; params: Record<string, unknown> } {
  assertValidIdentifier(table, 'crud.table');
  assertValidIdentifier(primaryKey, 'crud.primaryKey');
  const sql = `DELETE FROM [${table}] WHERE [${primaryKey}] = @_pkValue`;
  return { sql, params: { _pkValue: pkValue } };
}
