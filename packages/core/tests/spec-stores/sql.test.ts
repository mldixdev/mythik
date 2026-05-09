import { afterEach, describe, expect, it } from 'vitest';

import { createSqlDriver, SQL_STORE_DDL } from '../../src/sql/index.js';
import { SqlSpecStore } from '../../src/spec-stores/sql.js';
import type { SqlDriver } from '../../src/sql/index.js';

const openDrivers: SqlDriver[] = [];

async function openSqlSpecStore(table = 'screens'): Promise<{ driver: SqlDriver; store: SqlSpecStore }> {
  const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });
  openDrivers.push(driver);
  await driver.connect();
  await driver.exec(SQL_STORE_DDL.sqlite.screens);
  return { driver, store: new SqlSpecStore({ driver, table }) };
}

afterEach(async () => {
  while (openDrivers.length > 0) {
    await openDrivers.pop()!.close();
  }
});

describe('SqlSpecStore', () => {
  it('saves, loads, lists, updates, and deletes specs through a SqlDriver', async () => {
    const { driver, store } = await openSqlSpecStore();
    const firstSpec = { root: 'page', elements: { page: { type: 'box' } } };
    const secondSpec = { root: 'page', elements: { page: { type: 'box' }, button: { type: 'button' } } };

    await store.save('screen-a', firstSpec);
    await store.save('screen-b', { root: 'other' });

    expect(await store.load('screen-a')).toEqual(firstSpec);
    expect(await store.list()).toEqual(['screen-a', 'screen-b']);

    await store.save('screen-a', secondSpec);

    expect(await store.load('screen-a')).toEqual(secondSpec);
    const [row] = await driver.query<{ version: number; updated_at: string }>(
      'SELECT version, updated_at FROM screens WHERE id = @id',
      { id: 'screen-a' },
    );
    expect(row.version).toBe(2);
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    await store.delete('screen-b');
    expect(await store.list()).toEqual(['screen-a']);
    await expect(store.load('screen-b')).rejects.toThrow('Spec "screen-b" not found');
  });

  it('throws when deleting a missing spec', async () => {
    const { store } = await openSqlSpecStore();

    await expect(store.delete('missing')).rejects.toThrow('Spec "missing" not found');
  });
});
