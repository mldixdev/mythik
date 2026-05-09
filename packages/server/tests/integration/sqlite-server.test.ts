import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSqlDriver, type SqlDriver } from 'mythik/server';

import { createServer } from '../../src/server.js';
import type { ApiSpec, MythikServer } from '../../src/types.js';

const openDrivers: SqlDriver[] = [];
let server: MythikServer | undefined;
let tempDir: string | undefined;
let consoleLog: ReturnType<typeof vi.spyOn>;

const apiSpec: ApiSpec = {
  type: 'api',
  name: 'SQLite integration API',
  dialect: 'sqlite',
  endpoints: {
    rooms: {
      path: '/api/rooms',
      method: 'GET',
      query: 'SELECT id, name FROM rooms ORDER BY id',
    },
  },
};

beforeEach(() => {
  consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(async () => {
  await server?.stop();
  server = undefined;
  while (openDrivers.length > 0) {
    await openDrivers.pop()!.close();
  }
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
  consoleLog.mockRestore();
});

async function createSqliteFixture(): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), 'mythik-server-sqlite-'));
  const filename = join(tempDir, 'server.db');
  const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename } });
  openDrivers.push(driver);
  await driver.connect();
  await driver.exec('CREATE TABLE rooms (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
  await driver.exec('INSERT INTO rooms (id, name) VALUES (@id, @name)', { id: 1, name: 'Main room' });
  await driver.close();
  openDrivers.pop();
  return filename;
}

describe('SQLite mythik-server integration', () => {
  it('serves generated API routes from a SQLite database', async () => {
    const filename = await createSqliteFixture();
    server = createServer({
      spec: apiSpec,
      database: { type: 'sqlite', filename },
      specServing: false,
    });

    await server.start(0);

    const response = await request(server.getApp()).get('/api/rooms');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [{ id: 1, name: 'Main room' }] });
  });
});
