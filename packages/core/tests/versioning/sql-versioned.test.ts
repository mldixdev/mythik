import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSqlDriver, SQL_STORE_DDL } from '../../src/sql/index.js';
import { SqlEnvironmentStore, SqlVersionedSpecStore } from '../../src/spec-stores/sql-versioned.js';
import type { SqlDriver } from '../../src/sql/index.js';

const openDrivers: SqlDriver[] = [];

async function openSqlVersionedStores(config?: { snapshotInterval?: number }): Promise<{
  driver: SqlDriver;
  store: SqlVersionedSpecStore;
  envStore: SqlEnvironmentStore;
}> {
  const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename: ':memory:' } });
  openDrivers.push(driver);
  await driver.connect();
  for (const ddl of Object.values(SQL_STORE_DDL.sqlite)) {
    await driver.exec(ddl);
  }

  return {
    driver,
    store: new SqlVersionedSpecStore({ driver, snapshotInterval: config?.snapshotInterval }),
    envStore: new SqlEnvironmentStore({ driver }),
  };
}

afterEach(async () => {
  while (openDrivers.length > 0) {
    await openDrivers.pop()!.close();
  }
});

describe('SqlVersionedSpecStore', () => {
  it('saves snapshots and patches, reconstructs versions, and keeps current spec updated', async () => {
    const { store } = await openSqlVersionedStores({ snapshotInterval: 3 });
    const spec1 = { root: 'page', elements: { page: { type: 'box' } } };
    const spec2 = { root: 'page', elements: { page: { type: 'box' }, button: { type: 'button' } } };

    expect(await store.currentVersion('screen-a')).toBe(0);

    await expect(store.loadVersion('screen-a', 1)).rejects.toThrow('Version 1 not found');
    expect(await store.saveVersion('screen-a', spec1, { author: 'alice', source: 'push' })).toBe(1);
    expect(await store.saveVersion('screen-a', spec2, { author: 'bob', source: 'patch', description: 'Add button' })).toBe(2);

    expect(await store.currentVersion('screen-a')).toBe(2);
    expect(await store.load('screen-a')).toEqual(spec2);
    expect(await store.loadVersion('screen-a', 1)).toEqual(spec1);
    expect(await store.loadVersion('screen-a', 2)).toEqual(spec2);

    const versions = await store.listVersions('screen-a', 2);
    expect(versions).toMatchObject([
      { version: 2, author: 'bob', source: 'patch', description: 'Add button', isSnapshot: false },
      { version: 1, author: 'alice', source: 'push', isSnapshot: true },
    ]);
    expect(versions[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('bootstraps an existing current spec before saving a new version', async () => {
    const { store } = await openSqlVersionedStores();
    const existingSpec = { root: 'old' };
    const newSpec = { root: 'new' };

    await store.save('screen-a', existingSpec);
    const version = await store.saveVersion('screen-a', newSpec, { author: 'carla', source: 'push' });

    expect(version).toBe(2);
    expect(await store.loadVersion('screen-a', 1)).toEqual(existingSpec);
    expect(await store.loadVersion('screen-a', 2)).toEqual(newSpec);
  });

  it('quotes the current version aggregate alias for case-folding SQL dialects', async () => {
    const query = vi.fn(async () => [{ maxVersion: 7 }]);
    const driver = {
      query,
      quoteIdent: (identifier: string) => `"${identifier}"`,
    } as unknown as SqlDriver;
    const store = new SqlVersionedSpecStore({ driver });

    expect(await store.currentVersion('screen-a')).toBe(7);
    expect(query).toHaveBeenCalledWith(
      'SELECT MAX(version) AS "maxVersion" FROM "screen_versions" WHERE screen_id = @id',
      { id: 'screen-a' },
    );
  });
});

describe('SqlEnvironmentStore', () => {
  it('upserts environments per screen without cross-screen collisions', async () => {
    const { envStore } = await openSqlVersionedStores();

    await envStore.setEnvironment('screen-a', 'dev', 1, 'alice');
    await envStore.setEnvironment('screen-a', 'prod', 2, 'bob');
    await envStore.setEnvironment('screen-b', 'dev', 5, 'carla');
    await envStore.setEnvironment('screen-a', 'dev', 3, 'diana');

    expect(await envStore.getEnvironment('screen-a', 'missing')).toBeNull();
    expect(await envStore.getEnvironment('screen-a', 'dev')).toMatchObject({
      name: 'dev',
      version: 3,
      promotedBy: 'diana',
    });
    expect(await envStore.getEnvironment('screen-b', 'dev')).toMatchObject({
      name: 'dev',
      version: 5,
      promotedBy: 'carla',
    });

    const envs = await envStore.getEnvironments('screen-a');
    expect(envs.map((env) => env.name)).toEqual(['dev', 'prod']);
    expect(envs[0].promotedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
