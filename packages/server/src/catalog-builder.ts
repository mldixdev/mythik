import type { CatalogConfig } from './types.js';
import { assertValidIdentifier } from './validation/identifier-guard.js';
import type { SqlDriver } from 'mythik/server';

export function buildCatalogQuery(driver: SqlDriver, config: CatalogConfig): string | null {
  if (config.static) return null;

  if (!config.from) return null;

  assertValidIdentifier(config.from, 'catalog.from');

  if (config.distinct) {
    assertValidIdentifier(config.distinct, 'catalog.distinct');
    const orderByClause = config.orderBy
      ? `ORDER BY ${quoteOrderBy(driver, config.orderBy)}`
      : `ORDER BY ${quoteIdentifierPath(driver, config.distinct)} ASC`;
    return `SELECT DISTINCT ${quoteIdentifierPath(driver, config.distinct)} AS ${driver.quoteIdent('value')}, ${quoteIdentifierPath(driver, config.distinct)} AS ${driver.quoteIdent('label')} FROM ${quoteIdentifierPath(driver, config.from)} ${orderByClause}`;
  }

  assertValidIdentifier(config.value!, 'catalog.value');
  assertValidIdentifier(config.label!, 'catalog.label');

  const selectParts = [
    `${quoteIdentifierPath(driver, config.value!)} AS ${driver.quoteIdent('value')}`,
    `${quoteIdentifierPath(driver, config.label!)} AS ${driver.quoteIdent('label')}`,
  ];

  if (config.extra) {
    for (const field of config.extra) {
      assertValidIdentifier(field, 'catalog.extra');
      selectParts.push(quoteIdentifierPath(driver, field));
    }
  }

  const whereClause = config.where ? ` WHERE ${config.where}` : '';
  const orderByClause = config.orderBy
    ? `ORDER BY ${quoteOrderBy(driver, config.orderBy)}`
    : `ORDER BY ${quoteIdentifierPath(driver, config.label!)} ASC`;

  return `SELECT ${selectParts.join(', ')} FROM ${quoteIdentifierPath(driver, config.from)}${whereClause} ${orderByClause}`;
}

function quoteIdentifierPath(driver: SqlDriver, identifier: string): string {
  return identifier.includes('.')
    ? driver.quoteQualified(...identifier.split('.'))
    : driver.quoteIdent(identifier);
}

function quoteOrderBy(driver: SqlDriver, orderBy: string): string {
  const match = /^([a-zA-Z_][a-zA-Z0-9_.]*)(\s+(?:ASC|DESC))?$/i.exec(orderBy.trim());
  if (!match) return orderBy;
  const [, column, direction] = match;
  assertValidIdentifier(column!, 'catalog.orderBy');
  return `${quoteIdentifierPath(driver, column!)}${direction ?? ''}`;
}
