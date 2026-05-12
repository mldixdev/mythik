import { describe, expect, it, vi } from 'vitest';

import { createPostgresDriver } from '../src/sql/drivers/postgres.js';
import { createSqlDriver, SqlDriverError } from '../src/sql/index.js';

function createFakePg(responseQueue: Array<{ rows: Record<string, unknown>[]; rowCount?: number }> = []) {
  const query = vi.fn(async (statement: string, values?: readonly unknown[]) => {
    void statement;
    void values;
    return responseQueue.shift() ?? { rows: [], rowCount: 0 };
  });
  const release = vi.fn();
  const end = vi.fn(async () => undefined);
  const connect = vi.fn(async () => ({ query, release }));
  const Pool = vi.fn().mockImplementation(() => ({ query, end, connect }));

  return {
    pg: { Pool },
    query,
    release,
    end,
    connect,
    Pool,
  };
}

describe('PostgreSQL SQL driver', () => {
  it('creates a PostgreSQL driver through the public factory without loading pg eagerly', () => {
    const driver = createSqlDriver({
      dialect: 'postgres',
      connection: { connectionString: 'postgres://localhost/mythik' },
    });

    expect(driver.dialect).toBe('postgres');
    expect(driver.capabilities).toMatchObject({
      dialect: 'postgres',
      namedParams: true,
      positionalParams: true,
      nativeJson: true,
      nativeBoolean: true,
      returning: true,
      upsert: true,
      transactions: true,
    });
  });

  it('connects, compiles named params to positional params, and maps result sets through pg', async () => {
    const fake = createFakePg([{ rows: [{ id: 'home' }], rowCount: 1 }]);
    const driver = createPostgresDriver(
      { dialect: 'postgres', connection: { connectionString: 'postgres://localhost/mythik' } },
      { loadPg: async () => fake.pg },
    );

    const rows = await driver.query('SELECT * FROM "screens" WHERE id = @id OR name = @id AND active = @active', {
      id: 'home',
      active: true,
    });

    expect(rows).toEqual([{ id: 'home' }]);
    expect(fake.Pool).toHaveBeenCalledWith({ connectionString: 'postgres://localhost/mythik' });
    expect(fake.query).toHaveBeenCalledWith(
      'SELECT * FROM "screens" WHERE id = $1 OR name = $1 AND active = $2',
      ['home', true],
    );
  });

  it('quotes identifiers, paginates, and builds PostgreSQL returning SQL', () => {
    const driver = createPostgresDriver(
      { dialect: 'postgres', connection: {} },
      { loadPg: async () => createFakePg().pg },
    );

    expect(driver.quoteIdent('screen"name')).toBe('"screen""name"');
    expect(driver.quoteQualified('public', 'screens')).toBe('"public"."screens"');
    expect(driver.compileNamedParams('SELECT @id AS id', { id: 'home' })).toEqual({
      sql: 'SELECT $1 AS id',
      params: ['home'],
    });
    expect(() => driver.compileNamedParams('SELECT @missing AS id', {})).toThrow(SqlDriverError);

    expect(driver.paginate('SELECT * FROM screens', 5, 10)).toBe('SELECT * FROM screens ORDER BY 1 LIMIT 5 OFFSET 10');
    expect(driver.paginate('SELECT * FROM screens ORDER BY id', 5, 10)).toBe(
      'SELECT * FROM screens ORDER BY id LIMIT 5 OFFSET 10',
    );
    expect(driver.countQuery('SELECT * FROM screens;')).toBe(
      'SELECT COUNT(*) AS total FROM (SELECT * FROM screens) AS _mythik_count',
    );
    expect(driver.buildInsertReturning('screens', { id: 'home', name: 'Home' }, ['id']).sql).toContain(
      'RETURNING "id"',
    );
    expect(driver.buildUpdateReturning('screens', { name: 'Home' }, { sql: 'id = @id', params: { id: 'home' } }, ['id']).sql)
      .toContain('RETURNING "id"');
    expect(driver.buildUpsert('screens', { id: 'home', name: 'Home' }, ['id']).sql).toContain(
      'ON CONFLICT ("id") DO UPDATE',
    );
  });

  it('runs PostgreSQL transactions on a dedicated client', async () => {
    const fake = createFakePg();
    const driver = createPostgresDriver(
      { dialect: 'postgres', connection: { connectionString: 'postgres://localhost/mythik' } },
      { loadPg: async () => fake.pg },
    );

    await driver.transaction(async (tx) => {
      await tx.exec('UPDATE screens SET name = @name WHERE id = @id', { id: 'home', name: 'Home' });
    });

    expect(fake.connect).toHaveBeenCalledTimes(1);
    expect(fake.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(fake.query).toHaveBeenNthCalledWith(2, 'UPDATE screens SET name = $1 WHERE id = $2', ['Home', 'home']);
    expect(fake.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(fake.release).toHaveBeenCalledTimes(1);
  });

  it('checks table existence with schema-aware PostgreSQL metadata SQL', async () => {
    const fake = createFakePg([{ rows: [{ table_name: 'screens' }], rowCount: 1 }]);
    const driver = createPostgresDriver(
      { dialect: 'postgres', connection: { connectionString: 'postgres://localhost/mythik' } },
      { loadPg: async () => fake.pg },
    );

    await expect(driver.tableExists('tenant.screens')).resolves.toBe(true);
    expect(fake.query).toHaveBeenCalledWith(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
      ['tenant', 'screens'],
    );
  });

  it('reports missing pg dependency as a SqlDriverError', async () => {
    const driver = createPostgresDriver(
      { dialect: 'postgres', connection: { connectionString: 'postgres://localhost/mythik' } },
      {
        loadPg: async () => {
          throw new Error('Cannot find module pg');
        },
      },
    );

    await expect(driver.connect()).rejects.toMatchObject({
      name: 'SqlDriverError',
      code: 'SQL_DRIVER_DEPENDENCY_MISSING',
      dialect: 'postgres',
      packageName: 'pg',
      installCommand: 'npm install pg',
      message: expect.stringContaining('npm install pg'),
    });
  });

  it('maps PostgreSQL runtime errors to SqlDriverError', async () => {
    const fake = createFakePg();
    fake.query.mockRejectedValueOnce(new Error('bad sql'));
    const driver = createPostgresDriver(
      { dialect: 'postgres', connection: { connectionString: 'postgres://localhost/mythik' } },
      { loadPg: async () => fake.pg },
    );

    await expect(driver.query('SELECT bad')).rejects.toMatchObject({
      name: 'SqlDriverError',
      code: 'SQL_DRIVER_QUERY_FAILED',
      dialect: 'postgres',
    });

    const mapped = driver.mapError(new Error('manual'));
    expect(mapped).toBeInstanceOf(SqlDriverError);
  });
});
