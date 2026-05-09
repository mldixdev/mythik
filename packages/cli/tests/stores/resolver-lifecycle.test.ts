import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SqlDriver } from 'mythik/server';

function fakeSqlDriver(): SqlDriver & { close: ReturnType<typeof vi.fn<SqlDriver['close']>> } {
  const driver: SqlDriver = {
    dialect: 'sqlite',
    capabilities: {
      dialect: 'sqlite',
      namedParams: true,
      positionalParams: false,
      nativeJson: true,
      nativeBoolean: false,
      returning: true,
      upsert: true,
      transactions: true,
    },
    connect: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    transaction: vi.fn(async (run) => run(driver)),
    query: vi.fn(async () => []),
    exec: vi.fn(async () => ({ rows: [], affectedRows: 0 })),
    quoteIdent: (identifier) => `"${identifier}"`,
    quoteQualified: (...identifiers) => identifiers.map((identifier) => `"${identifier}"`).join('.'),
    compileNamedParams: (statement, params) => ({ sql: statement, params }),
    paginate: (statement, limit, offset) => `${statement} LIMIT ${limit} OFFSET ${offset}`,
    countQuery: (statement) => `SELECT COUNT(*) AS total FROM (${statement}) AS _mythik_count`,
    totalsQuery: (statement) => `SELECT * FROM (${statement}) AS _mythik_totals`,
    buildInsertReturning: (table, values) => ({ sql: `INSERT INTO ${table}`, params: values }),
    buildUpdateReturning: (table, values) => ({ sql: `UPDATE ${table}`, params: values }),
    buildDelete: (table, where) => ({ sql: `DELETE FROM ${table} ${where.sql}`, params: where.params }),
    buildUpsert: (table, values) => ({ sql: `UPSERT ${table}`, params: values }),
    tableExists: vi.fn(async () => false),
    mapError: (error) => error as Error,
  };
  return driver as SqlDriver & { close: ReturnType<typeof vi.fn<SqlDriver['close']>> };
}

async function loadResolverWithDriver(driver: SqlDriver): Promise<typeof import('../../src/stores/resolver.js')> {
  vi.resetModules();
  vi.doMock('mythik/server', async () => {
    const actual = await vi.importActual<typeof import('mythik/server')>('mythik/server');
    return {
      ...actual,
      createSqlDriver: vi.fn(() => driver),
    };
  });
  return import('../../src/stores/resolver.js');
}

describe('resolveVersionedStore SQL driver lifecycle', () => {
  afterEach(() => {
    vi.doUnmock('mythik/server');
    vi.resetModules();
  });

  it('keeps a shared SQL driver open until both versioned and environment stores close', async () => {
    const driver = fakeSqlDriver();
    const { resolveVersionedStore } = await loadResolverWithDriver(driver);
    const { store, envStore } = resolveVersionedStore({
      store: 'sqlite',
      sql: { dialect: 'sqlite', connection: { filename: ':memory:' } },
    });

    await (envStore as { close(): Promise<void> }).close();
    expect(driver.close).not.toHaveBeenCalled();

    await (store as { close(): Promise<void> }).close();
    expect(driver.close).toHaveBeenCalledTimes(1);

    await (envStore as { close(): Promise<void> }).close();
    expect(driver.close).toHaveBeenCalledTimes(1);
  });
});
