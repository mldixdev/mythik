import { describe, expect, it, vi } from 'vitest';

import { createMysqlDriver } from '../src/sql/drivers/mysql.js';
import { createSqlDriver, SqlDriverError } from '../src/sql/index.js';
import { SqlSpecStore } from '../src/spec-stores/sql.js';

type MysqlResponse = [unknown, unknown[]];

function createFakeMysql(responseQueue: MysqlResponse[] = []) {
  const execute = vi.fn(async (statement: string, values?: readonly unknown[]) => {
    void statement;
    void values;
    return responseQueue.shift() ?? [[], []];
  });
  const beginTransaction = vi.fn(async () => undefined);
  const commit = vi.fn(async () => undefined);
  const rollback = vi.fn(async () => undefined);
  const release = vi.fn();
  const end = vi.fn(async () => undefined);
  const getConnection = vi.fn(async () => ({ execute, beginTransaction, commit, rollback, release }));
  const createPool = vi.fn().mockImplementation(() => ({ execute, end, getConnection }));

  return {
    mysql: { createPool },
    execute,
    beginTransaction,
    commit,
    rollback,
    release,
    end,
    getConnection,
    createPool,
  };
}

describe('MySQL SQL driver', () => {
  it('creates a MySQL driver through the public factory without loading mysql2 eagerly', () => {
    const driver = createSqlDriver({
      dialect: 'mysql',
      connection: { uri: 'mysql://localhost/mythik' },
    });

    expect(driver.dialect).toBe('mysql');
    expect(driver.capabilities).toMatchObject({
      dialect: 'mysql',
      namedParams: true,
      positionalParams: true,
      nativeJson: true,
      nativeBoolean: false,
      returning: false,
      upsert: true,
      transactions: true,
    });
  });

  it('connects, compiles named params to positional params, and maps result sets through mysql2', async () => {
    const fake = createFakeMysql([[([{ id: 'home' }]), []]]);
    const driver = createMysqlDriver(
      { dialect: 'mysql', connection: { host: 'localhost', database: 'mythik' } },
      { loadMysql: async () => fake.mysql },
    );

    const rows = await driver.query('SELECT * FROM `screens` WHERE id = @id OR name = @id AND active = @active', {
      id: 'home',
      active: true,
    });

    expect(rows).toEqual([{ id: 'home' }]);
    expect(fake.createPool).toHaveBeenCalledWith({ host: 'localhost', database: 'mythik' });
    expect(fake.execute).toHaveBeenCalledWith(
      'SELECT * FROM `screens` WHERE id = ? OR name = ? AND active = ?',
      ['home', 'home', 1],
    );
  });

  it('quotes identifiers, paginates, and builds MySQL SQL without RETURNING', async () => {
    const fake = createFakeMysql([[{ affectedRows: 1, insertId: 42 }, []]]);
    const driver = createMysqlDriver(
      { dialect: 'mysql', connection: {} },
      { loadMysql: async () => fake.mysql },
    );

    expect(driver.quoteIdent('screen`name')).toBe('`screen``name`');
    expect(driver.quoteQualified('mythik', 'screens')).toBe('`mythik`.`screens`');
    expect(driver.compileNamedParams('SELECT @id AS id', { id: 'home' })).toEqual({
      sql: 'SELECT ? AS id',
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

    const insert = driver.buildInsertReturning('screens', { id: 'home', name: 'Home' }, ['id']);
    expect(insert.sql).toBe('INSERT INTO `screens` (`id`, `name`) VALUES (@id, @name)');
    expect(insert.sql).not.toContain('RETURNING');

    const result = await driver.exec(insert);
    expect(result).toMatchObject({ rows: [], affectedRows: 1, insertId: 42 });

    expect(driver.buildUpdateReturning('screens', { name: 'Home' }, { sql: 'id = @id', params: { id: 'home' } }, ['id']).sql)
      .toBe('UPDATE `screens` SET `name` = @set_name WHERE id = @id');
    const upsert = driver.buildUpsert('screens', { id: 'home', name: 'Home' }, ['id']).sql;
    expect(upsert).toContain(
      'AS _mythik_upsert ON DUPLICATE KEY UPDATE `name` = _mythik_upsert.`name`',
    );
    expect(upsert).not.toContain('VALUES(`name`)');
  });

  it('runs MySQL transactions on a dedicated connection', async () => {
    const fake = createFakeMysql();
    const driver = createMysqlDriver(
      { dialect: 'mysql', connection: { host: 'localhost', database: 'mythik' } },
      { loadMysql: async () => fake.mysql },
    );

    await driver.transaction(async (tx) => {
      await tx.exec('UPDATE screens SET name = @name WHERE id = @id', { id: 'home', name: 'Home' });
    });

    expect(fake.getConnection).toHaveBeenCalledTimes(1);
    expect(fake.beginTransaction).toHaveBeenCalledTimes(1);
    expect(fake.execute).toHaveBeenCalledWith('UPDATE screens SET name = ? WHERE id = ?', ['Home', 'home']);
    expect(fake.commit).toHaveBeenCalledTimes(1);
    expect(fake.release).toHaveBeenCalledTimes(1);
  });

  it('passes SqlSpecStore timestamps to mysql2 as Date values', async () => {
    const fake = createFakeMysql([
      [[], []],
      [{ affectedRows: 1, insertId: 1 }, []],
    ]);
    const driver = createMysqlDriver(
      { dialect: 'mysql', connection: { host: 'localhost', database: 'mythik' } },
      { loadMysql: async () => fake.mysql },
    );
    const store = new SqlSpecStore({ driver });

    await store.save('dashboard', { root: 'page' });

    const insertCall = fake.execute.mock.calls.find(([statement]) => statement.startsWith('INSERT INTO'));
    expect(insertCall).toBeDefined();
    const values = insertCall?.[1] ?? [];
    expect(values.some((value) => value instanceof Date)).toBe(true);
    expect(values.some((value) => typeof value === 'string' && /\d{4}-\d{2}-\d{2}T.*Z/.test(value))).toBe(false);
  });

  it('checks table existence with MySQL metadata SQL', async () => {
    const fake = createFakeMysql([[([{ TABLE_NAME: 'screens' }]), []]]);
    const driver = createMysqlDriver(
      { dialect: 'mysql', connection: { host: 'localhost', database: 'mythik' } },
      { loadMysql: async () => fake.mysql },
    );

    await expect(driver.tableExists('screens')).resolves.toBe(true);
    expect(fake.execute).toHaveBeenCalledWith(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = COALESCE(?, DATABASE()) AND TABLE_NAME = ?',
      [null, 'screens'],
    );
  });

  it('reports missing mysql2 dependency as a SqlDriverError', async () => {
    const driver = createMysqlDriver(
      { dialect: 'mysql', connection: { host: 'localhost', database: 'mythik' } },
      {
        loadMysql: async () => {
          throw new Error('Cannot find module mysql2/promise');
        },
      },
    );

    await expect(driver.connect()).rejects.toMatchObject({
      name: 'SqlDriverError',
      code: 'SQL_DRIVER_DEPENDENCY_MISSING',
      dialect: 'mysql',
    });
  });

  it('maps MySQL runtime errors to SqlDriverError', async () => {
    const fake = createFakeMysql();
    fake.execute.mockRejectedValueOnce(new Error('bad sql'));
    const driver = createMysqlDriver(
      { dialect: 'mysql', connection: { host: 'localhost', database: 'mythik' } },
      { loadMysql: async () => fake.mysql },
    );

    await expect(driver.query('SELECT bad')).rejects.toMatchObject({
      name: 'SqlDriverError',
      code: 'SQL_DRIVER_QUERY_FAILED',
      dialect: 'mysql',
    });

    const mapped = driver.mapError(new Error('manual'));
    expect(mapped).toBeInstanceOf(SqlDriverError);
  });
});
