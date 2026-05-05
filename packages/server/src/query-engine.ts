import sql, { type ISqlTypeFactoryWithNoParams } from 'mssql';
import type { ParamConfig } from './types.js';

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

export function buildCountQuery(query: string): string {
  const fromMatch = query.match(/\bFROM\b/i);
  if (!fromMatch || fromMatch.index === undefined) {
    return `SELECT COUNT(*) as _total FROM (${query}) as _countSource`;
  }

  const afterFrom = query.slice(fromMatch.index);
  const stripped = afterFrom.replace(/\s+ORDER\s+BY\s+[\s\S]+$/i, '');

  return `SELECT COUNT(*) as _total ${stripped}`;
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
  const stripped = afterFrom.replace(/\s+ORDER\s+BY\s+[\s\S]+$/i, '');

  return `SELECT ${selectClause} ${stripped}`;
}
