import type { ScopeFilterConfig } from './types.js';
import { assertValidIdentifier } from 'mythik';

export interface ScopeClause {
  sql: string;
  params: Record<string, unknown>;
}

export function resolveActiveScope(
  headerValue: string | undefined,
  type: 'int' | 'string' | undefined,
): unknown | null {
  if (headerValue === undefined || headerValue === '') return null;
  if (type === 'string') return headerValue;
  const parsed = parseInt(headerValue, 10);
  return isNaN(parsed) ? null : parsed;
}

function hasBypassRole(bypassRoles: string[], userRoles: string[]): boolean {
  return bypassRoles.some(role => userRoles.includes(role));
}

export function buildScopeWhereClause(
  config: ScopeFilterConfig,
  userScope: unknown[],
  activeScope: unknown | undefined,
  userRoles: string[],
  columnOverride?: string,
): ScopeClause | null {
  const bypassRoles = config.bypassRoles ?? [];
  if (hasBypassRole(bypassRoles, userRoles)) return null;

  const column = columnOverride ?? config.column;
  assertValidIdentifier(column, 'scopeFilter.column');
  const mode = config.mode ?? 'all';

  if (mode === 'select') {
    return {
      sql: `_scoped.${column} = @_activeScope`,
      params: { _activeScope: activeScope },
    };
  }

  // mode "all"
  if (userScope.length === 0) {
    return { sql: '1 = 0', params: {} };
  }

  const paramNames = userScope.map((_, i) => `@_scope${i}`);
  const params: Record<string, unknown> = {};
  userScope.forEach((val, i) => { params[`_scope${i}`] = val; });

  return {
    sql: `_scoped.${column} IN (${paramNames.join(', ')})`,
    params,
  };
}

export function validateScopeForInsert(
  config: ScopeFilterConfig,
  body: Record<string, unknown>,
  userScope: unknown[],
  userRoles: string[],
): boolean {
  const bypassRoles = config.bypassRoles ?? [];
  if (hasBypassRole(bypassRoles, userRoles)) return true;

  const column = config.column;
  const bodyValue = body[column];
  if (bodyValue === undefined || bodyValue === null) return false;

  return userScope.includes(bodyValue);
}

export function wrapQueryWithScopeFilter(
  originalSql: string,
  scopeClause: ScopeClause,
): string {
  return `SELECT * FROM (\n${originalSql}\n) AS _scoped\nWHERE ${scopeClause.sql}`;
}
