import { describe, expect, it, vi } from 'vitest';

import { createSqlServerDriver } from '../src/sql/drivers/sqlserver.js';
import { createSqlDriver, SqlDriverError } from '../src/sql/index.js';

function createFakeMssql(
  responseQueue: Array<{ recordset?: Record<string, unknown>[]; rowsAffected?: number[] }> = [],
  options: { transaction?: boolean } = {},
) {
  const input = vi.fn().mockReturnThis();
  const query = vi.fn(async (statement: string) => {
    void statement;
    return responseQueue.shift() ?? { recordset: [], rowsAffected: [0] };
  });
  const begin = vi.fn(async () => undefined);
  const commit = vi.fn(async () => undefined);
  const rollback = vi.fn(async () => undefined);
  const close = vi.fn(async () => undefined);
  const connect = vi.fn(async () => ({
    request: () => ({ input, query }),
    close,
  }));
  const ConnectionPool = vi.fn().mockImplementation(() => ({ connect }));
  const Transaction = vi.fn().mockImplementation(() => ({
    begin,
    commit,
    rollback,
    request: () => ({ input, query }),
  }));
  const NVarChar = Object.assign((length: unknown) => `NVarChar(${String(length)})`);
  const transactionShape = options.transaction === false ? {} : { Transaction };

  return {
    mssql: {
      default: {
        ConnectionPool,
        ...transactionShape,
        NVarChar,
        MAX: 'MAX',
        Int: 'Int',
        BigInt: 'BigInt',
        Bit: 'Bit',
        Float: 'Float',
        DateTime2: 'DateTime2',
      },
      ConnectionPool,
      ...transactionShape,
      NVarChar,
      MAX: 'MAX',
      Int: 'Int',
      BigInt: 'BigInt',
      Bit: 'Bit',
      Float: 'Float',
      DateTime2: 'DateTime2',
    },
    input,
    query,
    close,
    connect,
    ConnectionPool,
    Transaction,
    begin,
    commit,
    rollback,
  };
}

describe('SQL Server SQL driver', () => {
  it('creates a SQL Server driver through the public factory without loading mssql eagerly', () => {
    const driver = createSqlDriver({
      dialect: 'sqlserver',
      connection: { server: 'localhost', database: 'Mythik' },
    });

    expect(driver.dialect).toBe('sqlserver');
    expect(driver.capabilities).toMatchObject({
      dialect: 'sqlserver',
      namedParams: true,
      positionalParams: false,
      returning: true,
      upsert: true,
      transactions: true,
    });
  });

  it('connects, binds named params, and maps result sets through mssql', async () => {
    const fake = createFakeMssql([{ recordset: [{ id: 'home' }], rowsAffected: [1] }]);
    const driver = createSqlServerDriver(
      { dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } },
      { loadMssql: async () => fake.mssql },
    );

    const rows = await driver.query('SELECT * FROM [screens] WHERE id = @id AND active = @active', {
      id: 'home',
      active: true,
    });

    expect(rows).toEqual([{ id: 'home' }]);
    expect(fake.ConnectionPool).toHaveBeenCalledWith(expect.objectContaining({ server: 'localhost', database: 'Mythik' }));
    expect(fake.input).toHaveBeenCalledWith('id', 'NVarChar(MAX)', 'home');
    expect(fake.input).toHaveBeenCalledWith('active', 'Bit', true);
    expect(fake.query).toHaveBeenCalledWith('SELECT * FROM [screens] WHERE id = @id AND active = @active');
  });

  it('normalizes SQL Server URL connection strings before opening the pool', async () => {
    const fake = createFakeMssql([{ recordset: [{ ok: true }], rowsAffected: [1] }]);
    const driver = createSqlServerDriver(
      {
        dialect: 'sqlserver',
        connection: 'mssql://adm:%40sqlsql%40@localhost:1433/ReservaAlmuerzos?encrypt=false&trustServerCertificate=true',
      },
      { loadMssql: async () => fake.mssql },
    );

    await driver.query('SELECT 1 AS ok');

    expect(fake.ConnectionPool).toHaveBeenCalledWith(expect.objectContaining({
      server: 'localhost',
      port: 1433,
      database: 'ReservaAlmuerzos',
      user: 'adm',
      password: '@sqlsql@',
      options: expect.objectContaining({
        encrypt: false,
        trustServerCertificate: true,
      }),
    }));
  });

  it('preserves SQL Server named params, quotes identifiers, and builds dialect SQL', () => {
    const driver = createSqlServerDriver({ dialect: 'sqlserver', connection: {} }, { loadMssql: async () => createFakeMssql().mssql });

    expect(driver.quoteIdent('screen]name')).toBe('[screen]]name]');
    expect(driver.quoteQualified('dbo', 'screens')).toBe('[dbo].[screens]');
    expect(driver.compileNamedParams('SELECT @id AS id', { id: 'home' })).toEqual({
      sql: 'SELECT @id AS id',
      params: { id: 'home' },
    });
    expect(() => driver.compileNamedParams('SELECT @missing AS id', {})).toThrow(SqlDriverError);

    expect(driver.paginate('SELECT * FROM [screens] ORDER BY [id]', 5, 10)).toBe(
      'SELECT * FROM [screens] ORDER BY [id] OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY',
    );
    expect(driver.countQuery('SELECT * FROM [screens];')).toBe(
      'SELECT COUNT(*) AS total FROM (SELECT * FROM [screens]) AS [mythik_count]',
    );
    expect(driver.countQuery('SELECT * FROM [screens] ORDER BY [id] DESC;')).toBe(
      'SELECT COUNT(*) AS total FROM (SELECT * FROM [screens]) AS [mythik_count]',
    );
    expect(driver.totalsQuery('SELECT * FROM [screens] ORDER BY [id] DESC;')).toBe(
      'SELECT * FROM (SELECT * FROM [screens]) AS [mythik_totals]',
    );
    expect(driver.buildInsertReturning('screens', { id: 'home', name: 'Home' }, ['id']).sql).toContain(
      'OUTPUT INSERTED.[id]',
    );
    expect(driver.buildUpdateReturning('screens', { name: 'Home' }, { sql: 'id = @id', params: { id: 'home' } }, ['id']).sql)
      .toContain('OUTPUT INSERTED.[id]');
    expect(driver.buildUpsert('screens', { id: 'home', name: 'Home' }, ['id']).sql).toContain('MERGE [screens]');
  });

  it('reports missing mssql dependency as a SqlDriverError', async () => {
    const driver = createSqlServerDriver(
      { dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } },
      {
        loadMssql: async () => {
          throw new Error('Cannot find module mssql');
        },
      },
    );

    await expect(driver.connect()).rejects.toMatchObject({
      name: 'SqlDriverError',
      code: 'SQL_DRIVER_DEPENDENCY_MISSING',
      dialect: 'sqlserver',
    });
  });

  it('maps SQL Server runtime errors to SqlDriverError', async () => {
    const fake = createFakeMssql();
    fake.query.mockRejectedValueOnce(new Error('bad sql'));
    const driver = createSqlServerDriver(
      { dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } },
      { loadMssql: async () => fake.mssql },
    );

    await expect(driver.query('SELECT bad')).rejects.toMatchObject({
      name: 'SqlDriverError',
      code: 'SQL_DRIVER_QUERY_FAILED',
      dialect: 'sqlserver',
    });

    const mapped = driver.mapError(new Error('manual'));
    expect(mapped).toBeInstanceOf(SqlDriverError);
  });

  it('treats SQL Server DDL exec results without recordsets as empty mutations', async () => {
    const fake = createFakeMssql([{ rowsAffected: undefined }]);
    const driver = createSqlServerDriver(
      { dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } },
      { loadMssql: async () => fake.mssql },
    );

    const result = await driver.exec('CREATE DATABASE [MythikE2E]');

    expect(result).toEqual({ rows: [], affectedRows: 0, insertId: undefined });
    expect(fake.query).toHaveBeenCalledWith('CREATE DATABASE [MythikE2E]');
  });

  it('fails loudly when the mssql module does not expose Transaction', async () => {
    const fake = createFakeMssql([], { transaction: false });
    const driver = createSqlServerDriver(
      { dialect: 'sqlserver', connection: { server: 'localhost', database: 'Mythik' } },
      { loadMssql: async () => fake.mssql },
    );

    await expect(driver.transaction(async () => undefined)).rejects.toMatchObject({
      name: 'SqlDriverError',
      code: 'SQL_TRANSACTION_UNAVAILABLE',
      dialect: 'sqlserver',
    });
  });
});
