import sql, { type ISqlTypeFactoryWithNoParams } from 'mssql';
import type { ParamConfig } from './types.js';
import { SCOPE_ALIAS } from './auth/scope-filter.js';
import { assertValidIdentifier } from './validation/identifier-guard.js';

export function parseParamValue(
  raw: string | undefined,
  type: ParamConfig['type'],
  max?: number,
): unknown {
  if (raw === undefined || raw === '') return null;

  switch (type) {
    case 'int': {
      const n = parseInt(raw, 10);
      if (isNaN(n)) return null;
      return max !== undefined && n > max ? max : n;
    }
    case 'float': {
      const f = parseFloat(raw);
      return isNaN(f) ? null : f;
    }
    case 'boolean':
      return raw === 'true' || raw === '1';
    case 'date':
      return raw;
    case 'string':
    default:
      return raw;
  }
}

export function getSqlType(type: ParamConfig['type']): ISqlTypeFactoryWithNoParams {
  switch (type) {
    case 'int': return sql.Int;
    case 'float': return sql.Float;
    case 'boolean': return sql.Bit;
    case 'date': return sql.NVarChar;
    case 'string':
    default: return sql.NVarChar;
  }
}

export function buildPaginatedQuery(query: string): string {
  return `${query}\nOFFSET @_offset ROWS FETCH NEXT @_pageSize ROWS ONLY`;
}

export interface CountQueryOptions {
  scopeClause?: { sql: string } | null;
}

export interface EndpointCountQueryOptions extends CountQueryOptions {
  customCount?: string;
}

function stripTrailingOrderBy(query: string): string {
  return query.replace(/\s+ORDER\s+BY\s+[\s\S]+$/i, '').trim();
}

const SCOPE_COUNT_MACRO_PATTERN = /{{\s*scope(Where|And)(?::\s*([^}\s]+))?\s*}}/g;

function scopeSqlForAlias(sql: string, alias: string | undefined): string {
  if (alias) {
    assertValidIdentifier(alias, 'endpoint.count scope macro alias');
    return sql.replaceAll(`${SCOPE_ALIAS}.`, `${alias}.`);
  }
  return sql.replaceAll(`${SCOPE_ALIAS}.`, '');
}

function renderCountScopeMacros(countSql: string, scopeClause: { sql: string } | null | undefined): string {
  return countSql
    .replace(SCOPE_COUNT_MACRO_PATTERN, (_match, macroKind: string, alias: string | undefined) => {
      if (!scopeClause) return '';
      const keyword = macroKind === 'Where' ? 'WHERE' : 'AND';
      return `${keyword} ${scopeSqlForAlias(scopeClause.sql, alias)}`;
    })
    .trim();
}

export function buildCountQuery(query: string, options: CountQueryOptions = {}): string {
  if (options.scopeClause) {
    const source = stripTrailingOrderBy(query);
    const scopedSource = `SELECT * FROM (\n${source}\n) AS ${SCOPE_ALIAS}\nWHERE ${options.scopeClause.sql}`;
    return `SELECT COUNT(*) as _total FROM (\n${scopedSource}\n) AS _countSource`;
  }

  const fromMatch = query.match(/\bFROM\b/i);
  if (!fromMatch || fromMatch.index === undefined) {
    return `SELECT COUNT(*) as _total FROM (${query}) as _countSource`;
  }

  const afterFrom = query.slice(fromMatch.index);
  const stripped = stripTrailingOrderBy(afterFrom);

  return `SELECT COUNT(*) as _total ${stripped}`;
}

export function buildEndpointCountQuery(
  query: string,
  options: EndpointCountQueryOptions = {},
): string {
  if (options.customCount) {
    return renderCountScopeMacros(options.customCount, options.scopeClause);
  }

  return buildCountQuery(query, options);
}

export function buildTotalsQuery(query: string, totals: string[]): string | null {
  if (!totals || totals.length === 0) return null;

  const aggregations = totals.map(t => {
    if (t === 'COUNT:*') return 'COUNT(*) as [COUNT:*]';
    const [fn, field] = t.split(':');
    if (fn === 'COUNT_DISTINCT') return `COUNT(DISTINCT ${field}) as [COUNT_DISTINCT:${field}]`;
    return `${fn}(${field}) as [${fn}:${field}]`;
  });

  const selectClause = aggregations.join(', ');

  const fromMatch = query.match(/\bFROM\b/i);
  if (!fromMatch || fromMatch.index === undefined) return null;

  const afterFrom = query.slice(fromMatch.index);
  const stripped = stripTrailingOrderBy(afterFrom);

  return `SELECT ${selectClause} ${stripped}`;
}
