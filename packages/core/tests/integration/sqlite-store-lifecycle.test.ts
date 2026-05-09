import { afterEach, describe, expect, it } from 'vitest';

import { createSqlDriver, getSqlStoreDdl, type SqlDriver } from '../../src/sql/index.js';
import { SqlSpecStore } from '../../src/spec-stores/sql.js';
import { SqlEnvironmentStore, SqlVersionedSpecStore } from '../../src/spec-stores/sql-versioned.js';

const openDrivers: SqlDriver[] = [];

async function createInitializedSqliteDriver(): Promise<SqlDriver> {
  const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });
  openDrivers.push(driver);
  await driver.connect();
  for (const statement of getSqlStoreDdl('sqlite')) {
    await driver.exec(statement);
  }
  return driver;
}

afterEach(async () => {
  while (openDrivers.length > 0) {
    await openDrivers.pop()!.close();
  }
});

describe('SQLite SQL store lifecycle integration', () => {
  it('saves specs, versions them, and promotes environments through one SqlDriver', async () => {
    const driver = await createInitializedSqliteDriver();
    const specStore = new SqlSpecStore({ driver });
    const versionedStore = new SqlVersionedSpecStore({ driver });
    const envStore = new SqlEnvironmentStore({ driver });

    const first = { root: 'page', elements: { page: { type: 'box' } } };
    const second = { root: 'page', elements: { page: { type: 'box' }, title: { type: 'text', text: 'Ready' } } };

    await specStore.save('floor-editor', first);
    expect(await specStore.load('floor-editor')).toEqual(first);

    const version = await versionedStore.saveVersion('floor-editor', second, {
      author: 'integration',
      source: 'patch',
    });

    expect(version).toBe(2);
    expect(await versionedStore.loadVersion('floor-editor', version)).toEqual(second);

    await envStore.setEnvironment('floor-editor', 'prod', version, 'integration');
    await expect(envStore.getEnvironment('floor-editor', 'prod')).resolves.toMatchObject({
      name: 'prod',
      version,
      promotedBy: 'integration',
    });
  });
});
