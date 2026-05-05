import type { CatalogConfig } from './types.js';
import { assertValidIdentifier } from './validation/identifier-guard.js';

export function buildCatalogQuery(config: CatalogConfig): string | null {
  if (config.static) return null;

  if (!config.from) return null;

  assertValidIdentifier(config.from, 'catalog.from');

  if (config.distinct) {
    assertValidIdentifier(config.distinct, 'catalog.distinct');
    const orderByClause = config.orderBy
      ? `ORDER BY ${bracketOrderBy(config.orderBy)}`
      : `ORDER BY [${config.distinct}] ASC`;
    return `SELECT DISTINCT [${config.distinct}] AS [value], [${config.distinct}] AS [label] FROM [${config.from}] ${orderByClause}`;
  }

  assertValidIdentifier(config.value!, 'catalog.value');
  assertValidIdentifier(config.label!, 'catalog.label');

  const selectParts = [`[${config.value}] AS [value]`, `[${config.label}] AS [label]`];

  if (config.extra) {
    for (const field of config.extra) {
      assertValidIdentifier(field, 'catalog.extra');
      selectParts.push(`[${field}]`);
    }
  }

  const whereClause = config.where ? ` WHERE ${config.where}` : '';
  const orderByClause = config.orderBy
    ? `ORDER BY ${bracketOrderBy(config.orderBy)}`
    : `ORDER BY [${config.label}] ASC`;

  return `SELECT ${selectParts.join(', ')} FROM [${config.from}]${whereClause} ${orderByClause}`;
}

function bracketOrderBy(orderBy: string): string {
  return orderBy.replace(/^(\w+)(\s+(?:ASC|DESC))?$/i, (_match, col: string, dir: string | undefined) => {
    return `[${col}]${dir ?? ''}`;
  });
}
