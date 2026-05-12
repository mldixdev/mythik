import { afterEach, describe, expect, it } from 'vitest';

import { createSqliteDriver } from '../src/sql/drivers/sqlite.js';
import { createSqlDriver, SQL_STORE_DDL, SqlDriverError } from '../src/sql/index.js';
import type { SqlDriver } from '../src/sql/index.js';

const openDrivers: SqlDriver[] = [];

async function openSqliteDriver(): Promise<SqlDriver> {
  const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });
  openDrivers.push(driver);
  await driver.connect();
  return driver;
}

afterEach(async () => {
  while (openDrivers.length > 0) {
    await openDrivers.pop()!.close();
  }
});

describe('SQLite SQL driver', () => {
  it('connects through createSqlDriver and executes canonical store DDL', async () => {
    const driver = await openSqliteDriver();

    expect(driver.dialect).toBe('sqlite');
    expect(driver.capabilities).toMatchObject({
      dialect: 'sqlite',
      namedParams: true,
      positionalParams: true,
      nativeJson: false,
      nativeBoolean: false,
      returning: true,
      upsert: true,
      transactions: true,
    });

    for (const ddl of Object.values(SQL_STORE_DDL.sqlite)) {
      await driver.exec(ddl);
    }

    expect(await driver.tableExists('screens')).toBe(true);
    expect(await driver.tableExists('missing_table')).toBe(false);
  });

  it('compiles named params, quotes identifiers, and paginates queries for SQLite', async () => {
    const driver = await openSqliteDriver();

    expect(driver.quoteIdent('screen"name')).toBe('"screen""name"');
    expect(driver.quoteQualified('main', 'screens')).toBe('"main"."screens"');

    const compiled = driver.compileNamedParams(
      'SELECT * FROM "screens" WHERE id = @id OR name = @id -- keep @comment',
      { id: 'home' },
    );

    expect(compiled).toEqual({
      sql: 'SELECT * FROM "screens" WHERE id = ? OR name = ? -- keep @comment',
      params: ['home', 'home'],
    });
    expect(driver.paginate('SELECT * FROM screens', 10, 20)).toBe('SELECT * FROM screens ORDER BY 1 LIMIT 10 OFFSET 20');
    expect(driver.paginate('SELECT * FROM screens ORDER BY id', 10, 20)).toBe(
      'SELECT * FROM screens ORDER BY id LIMIT 10 OFFSET 20',
    );
    expect(driver.countQuery('SELECT * FROM screens;')).toBe(
      'SELECT COUNT(*) AS total FROM (SELECT * FROM screens) AS _mythik_count',
    );
    expect(driver.totalsQuery('SELECT * FROM screens')).toBe('SELECT * FROM (SELECT * FROM screens) AS _mythik_totals');
  });

  it('supports inserts, updates, deletes, upserts, and transactions', async () => {
    const driver = await openSqliteDriver();
    await driver.exec(SQL_STORE_DDL.sqlite.screens);

    const inserted = await driver.exec(
      driver.buildInsertReturning('screens', {
        id: 'home',
        name: 'Home',
        spec: JSON.stringify({ elements: [] }),
        version: 1,
        is_active: true,
      }),
    );

    expect(inserted.affectedRows).toBe(1);
    expect(inserted.rows).toMatchObject([{ id: 'home', name: 'Home', version: 1 }]);
    expect(inserted.insertId).not.toBeUndefined();

    const rows = await driver.query('SELECT id, name FROM screens WHERE id = @id', { id: 'home' });
    expect(rows).toEqual([{ id: 'home', name: 'Home' }]);

    const updated = await driver.exec(
      driver.buildUpdateReturning(
        'screens',
        { name: 'Dashboard', version: 2 },
        { sql: 'id = @id', params: { id: 'home' } },
      ),
    );

    expect(updated.rows).toMatchObject([{ id: 'home', name: 'Dashboard', version: 2 }]);

    const upserted = await driver.exec(
      driver.buildUpsert(
        'screens',
        {
          id: 'home',
          name: 'Dashboard v3',
          spec: JSON.stringify({ elements: [{ type: 'text' }] }),
          version: 3,
          is_active: true,
        },
        ['id'],
      ),
    );

    expect(upserted.rows).toMatchObject([{ id: 'home', name: 'Dashboard v3', version: 3 }]);

    await expect(
      driver.transaction(async (tx) => {
        expect(tx).not.toBe(driver);
        await tx.exec('INSERT INTO screens (id, name, spec, version, is_active) VALUES (@id, @name, @spec, @version, @active)', {
          id: 'rollback',
          name: 'Rollback',
          spec: '{}',
          version: 1,
          active: true,
        });
        throw new Error('rollback please');
      }),
    ).rejects.toThrow('rollback please');

    expect(await driver.query('SELECT id FROM screens WHERE id = @id', { id: 'rollback' })).toEqual([]);

    const deleted = await driver.exec(driver.buildDelete('screens', { sql: 'id = @id', params: { id: 'home' } }));
    expect(deleted.affectedRows).toBe(1);
    expect(await driver.query('SELECT id FROM screens')).toEqual([]);
  });

  it('reports missing optional SQLite dependency as a SqlDriverError', async () => {
    const driver = createSqliteDriver(
      { dialect: 'sqlite', connection: { filename: ':memory:' } },
      {
        loadDatabase: async () => {
          throw new Error('Cannot find module better-sqlite3');
        },
      },
    );

    await expect(driver.connect()).rejects.toMatchObject({
      name: 'SqlDriverError',
      code: 'SQL_DRIVER_DEPENDENCY_MISSING',
      dialect: 'sqlite',
      packageName: 'better-sqlite3',
      installCommand: 'npm install better-sqlite3',
      message: expect.stringContaining('npm install better-sqlite3'),
    });
  });

  it('maps SQLite runtime errors to SqlDriverError without losing the original cause', async () => {
    const driver = await openSqliteDriver();

    await expect(driver.query('SELECT * FROM missing_table')).rejects.toMatchObject({
      name: 'SqlDriverError',
      code: 'SQL_DRIVER_QUERY_FAILED',
      dialect: 'sqlite',
    });

    const mapped = driver.mapError(new Error('manual'));
    expect(mapped).toBeInstanceOf(SqlDriverError);
    expect((mapped as SqlDriverError).cause).toBeInstanceOf(Error);
  });
});
