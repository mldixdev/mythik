import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SqlDriver, SqlMutationResult, SqlStatement } from 'mythik/server';

import type { ApiSpec, MythikServer } from '../src/types.js';

const mysqlCapabilities = {
  dialect: 'mysql' as const,
  namedParams: true,
  positionalParams: true,
  nativeJson: true,
  nativeBoolean: false,
  returning: false,
  upsert: true,
  transactions: true,
};

const apiSpec: ApiSpec = {
  type: 'api',
  name: 'MySQL CRUD API',
  dialect: 'mysql',
  endpoints: {
    widgets: {
      path: '/api/widgets',
      crud: {
        table: 'widgets',
        primaryKey: 'id',
        insertable: ['name'],
        updatable: ['name'],
      },
    },
  },
};

function objectParams(statement: SqlStatement): Record<string, unknown> {
  return (statement.params ?? {}) as Record<string, unknown>;
}

function fakeMysqlDriver(): SqlDriver & {
  exec: ReturnType<typeof vi.fn<SqlDriver['exec']>>;
  query: ReturnType<typeof vi.fn<SqlDriver['query']>>;
} {
  const driver: SqlDriver = {
    dialect: 'mysql',
    capabilities: mysqlCapabilities,
    connect: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    transaction: vi.fn(async (run) => run(driver)),
    query: vi.fn(),
    exec: vi.fn(),
    quoteIdent: (identifier) => `\`${identifier}\``,
    quoteQualified: (...identifiers) => identifiers.map((identifier) => `\`${identifier}\``).join('.'),
    compileNamedParams: (statement, params) => ({ sql: statement, params }),
    paginate: (statement, limit, offset) => `${statement} LIMIT ${limit} OFFSET ${offset}`,
    countQuery: (statement) => `SELECT COUNT(*) AS total FROM (${statement}) AS _mythik_count`,
    totalsQuery: (statement) => `SELECT * FROM (${statement}) AS _mythik_totals`,
    buildInsertReturning: (table, values) => ({
      sql: `INSERT INTO \`${table}\` (${Object.keys(values).map((key) => `\`${key}\``).join(', ')}) VALUES (${Object.keys(values).map((key) => `@${key}`).join(', ')})`,
      params: values,
    }),
    buildUpdateReturning: (table, values, where) => {
      const params = { ...objectParams(where) };
      const assignments = Object.keys(values).map((key) => {
        params[`set_${key}`] = values[key];
        return `\`${key}\` = @set_${key}`;
      });
      return {
        sql: `UPDATE \`${table}\` SET ${assignments.join(', ')} ${where.sql}`,
        params,
      };
    },
    buildDelete: (table, where) => ({
      sql: `DELETE FROM \`${table}\` ${where.sql}`,
      params: objectParams(where),
    }),
    buildUpsert: (table, values) => ({
      sql: `UPSERT ${table}`,
      params: values,
    }),
    tableExists: vi.fn(async () => false),
    mapError: (error) => error as Error,
  };
  return driver as SqlDriver & {
    exec: ReturnType<typeof vi.fn<SqlDriver['exec']>>;
    query: ReturnType<typeof vi.fn<SqlDriver['query']>>;
  };
}

async function createServerWithDriver(driver: SqlDriver): Promise<typeof import('../src/server.js')> {
  vi.resetModules();
  vi.doMock('mythik/server', async () => {
    const actual = await vi.importActual<typeof import('mythik/server')>('mythik/server');
    return {
      ...actual,
      createSqlDriver: vi.fn(() => driver),
    };
  });
  return import('../src/server.js');
}

describe('MySQL CRUD endpoints without RETURNING support', () => {
  let server: MythikServer | undefined;
  let consoleLog: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await server?.stop();
    server = undefined;
    consoleLog.mockRestore();
    vi.doUnmock('mythik/server');
    vi.resetModules();
  });

  it('POST reads the inserted row back using insertId', async () => {
    const driver = fakeMysqlDriver();
    driver.exec.mockResolvedValueOnce({ rows: [], affectedRows: 1, insertId: 42 } satisfies SqlMutationResult);
    driver.query.mockResolvedValueOnce([{ id: 42, name: 'Widget' }]);
    const { createServer } = await createServerWithDriver(driver);
    server = createServer({
      spec: apiSpec,
      database: { type: 'mysql', uri: 'mysql://localhost/mythik' },
      specServing: false,
    });

    await server.start(0);
    const response = await request(server.getApp()).post('/api/widgets').send({ name: 'Widget', ignored: true });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 42, name: 'Widget' });
    expect(driver.query).toHaveBeenCalledWith('SELECT * FROM `widgets` WHERE `id` = @_pkValue', { _pkValue: 42 });
  });

  it('PUT reads the updated row back instead of treating an empty rows array as 404', async () => {
    const driver = fakeMysqlDriver();
    driver.exec.mockResolvedValueOnce({ rows: [], affectedRows: 1 } satisfies SqlMutationResult);
    driver.query.mockResolvedValueOnce([{ id: '42', name: 'Updated' }]);
    const { createServer } = await createServerWithDriver(driver);
    server = createServer({
      spec: apiSpec,
      database: { type: 'mysql', uri: 'mysql://localhost/mythik' },
      specServing: false,
    });

    await server.start(0);
    const response = await request(server.getApp()).put('/api/widgets/42').send({ name: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: '42', name: 'Updated' });
    expect(driver.query).toHaveBeenCalledWith('SELECT * FROM `widgets` WHERE `id` = @_pkValue', { _pkValue: '42' });
  });

  it('PUT returns the existing row when MySQL reports no changed values', async () => {
    const driver = fakeMysqlDriver();
    driver.exec.mockResolvedValueOnce({ rows: [], affectedRows: 0 } satisfies SqlMutationResult);
    driver.query.mockResolvedValueOnce([{ id: '42', name: 'Same' }]);
    const { createServer } = await createServerWithDriver(driver);
    server = createServer({
      spec: apiSpec,
      database: { type: 'mysql', uri: 'mysql://localhost/mythik' },
      specServing: false,
    });

    await server.start(0);
    const response = await request(server.getApp()).put('/api/widgets/42').send({ name: 'Same' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: '42', name: 'Same' });
    expect(driver.query).toHaveBeenCalledWith('SELECT * FROM `widgets` WHERE `id` = @_pkValue', { _pkValue: '42' });
  });

  it('PUT returns 404 when the scoped read-back cannot find the record', async () => {
    const driver = fakeMysqlDriver();
    driver.exec.mockResolvedValueOnce({ rows: [], affectedRows: 0 } satisfies SqlMutationResult);
    driver.query.mockResolvedValueOnce([]);
    const { createServer } = await createServerWithDriver(driver);
    server = createServer({
      spec: apiSpec,
      database: { type: 'mysql', uri: 'mysql://localhost/mythik' },
      specServing: false,
    });

    await server.start(0);
    const response = await request(server.getApp()).put('/api/widgets/999').send({ name: 'Missing' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
