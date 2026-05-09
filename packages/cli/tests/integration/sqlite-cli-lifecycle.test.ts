import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createSqlDriver,
  SqlEnvironmentStore,
  SqlSpecStore,
  SqlVersionedSpecStore,
  type SqlDriver,
} from 'mythik/server';

import { loadConfig } from '../../src/config.js';
import { runInitStore } from '../../src/commands/init-store.js';
import { runPatch } from '../../src/commands/patch.js';
import { runPush } from '../../src/commands/push.js';
import { resolveStore } from '../../src/stores/resolver.js';

const openDrivers: SqlDriver[] = [];

const initialSpec = {
  root: 'page',
  elements: {
    page: { type: 'box', children: ['title'] },
    title: { type: 'text', text: 'Draft' },
  },
};

async function closeIfPresent(value: unknown): Promise<void> {
  const close = (value as { close?: () => Promise<void> }).close;
  if (typeof close === 'function') {
    await close.call(value);
  }
}

afterEach(async () => {
  while (openDrivers.length > 0) {
    await openDrivers.pop()!.close();
  }
});

describe('SQLite CLI lifecycle integration', () => {
  it('initializes, pushes, patches, loads, versions, and promotes through SQLite', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mythik-cli-sqlite-lifecycle-'));
    let store: unknown;
    try {
      const target = join(dir, 'mythik.db');

      const init = await runInitStore({ dialect: 'sqlite', target });
      expect(init.exitCode).toBe(0);

      const config = loadConfig({
        cwd: dir,
        flags: { store: 'sqlite', filename: target },
      });
      store = resolveStore(config);

      await expect(runPush('floor-editor', JSON.stringify(initialSpec), { store, json: false, force: false }))
        .resolves.toMatchObject({ exitCode: 0 });

      await expect(
        runPatch(
          'floor-editor',
          [{ op: 'replace', path: '/elements/title/text', value: 'Published' }],
          { store, json: false },
        ),
      ).resolves.toMatchObject({ exitCode: 0 });

      const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename: target } });
      openDrivers.push(driver);
      const sqlStore = new SqlSpecStore({ driver });
      await expect(sqlStore.load('floor-editor')).resolves.toMatchObject({
        elements: { title: { text: 'Published' } },
      });

      const versionedStore = new SqlVersionedSpecStore({ driver });
      const envStore = new SqlEnvironmentStore({ driver });
      const version = await versionedStore.saveVersion(
        'floor-editor',
        await sqlStore.load('floor-editor'),
        { author: 'cli-integration', source: 'patch' },
      );
      await envStore.setEnvironment('floor-editor', 'prod', version, 'cli-integration');

      await expect(versionedStore.loadVersion('floor-editor', version)).resolves.toMatchObject({
        elements: { title: { text: 'Published' } },
      });
      await expect(envStore.getEnvironment('floor-editor', 'prod')).resolves.toMatchObject({
        name: 'prod',
        version,
      });

      await driver.close();
      openDrivers.pop();
    } finally {
      await closeIfPresent(store);
      while (openDrivers.length > 0) {
        await openDrivers.pop()!.close();
      }
      await rm(dir, { recursive: true, force: true });
    }
  });
});
