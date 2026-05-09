import { mkdtemp, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createSqlDriver, type SqlDriver } from 'mythik/server';

import { connectionFor, runInitStore } from '../../src/commands/init-store.js';

const openDrivers: SqlDriver[] = [];

afterEach(async () => {
  while (openDrivers.length > 0) {
    await openDrivers.pop()!.close();
  }
});

describe('init-store command', () => {
  it('creates canonical tables in a SQLite database file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mythik-init-store-'));
    const target = join(dir, 'mythik.db');

    const result = await runInitStore({ dialect: 'sqlite', target });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Initialized sqlite Mythik store');
    await expect(stat(target)).resolves.toBeTruthy();

    const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename: target } });
    openDrivers.push(driver);
    expect(await driver.tableExists('screens')).toBe(true);
    expect(await driver.tableExists('screen_versions')).toBe(true);
    expect(await driver.tableExists('screen_environments')).toBe(true);
  });

  it('is safe to run more than once against an existing SQLite store', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mythik-init-store-repeat-'));
    const target = join(dir, 'mythik.db');

    const first = await runInitStore({ dialect: 'sqlite', target });
    const second = await runInitStore({ dialect: 'sqlite', target });

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);

    const driver = createSqlDriver({ dialect: 'sqlite', connection: { filename: target } });
    openDrivers.push(driver);
    expect(await driver.tableExists('screens')).toBe(true);
    expect(await driver.tableExists('screen_versions')).toBe(true);
    expect(await driver.tableExists('screen_environments')).toBe(true);
  });

  it('prints PostgreSQL DDL in dry-run mode without connecting', async () => {
    const result = await runInitStore({ dialect: 'postgres', dryRun: true });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('CREATE TABLE IF NOT EXISTS screens');
    expect(result.output).toContain('JSONB');
    expect(result.output).toContain('screen_environments');
  });

  it('prints MySQL DDL in dry-run mode without connecting', async () => {
    const result = await runInitStore({ dialect: 'mysql', dryRun: true });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('CREATE TABLE IF NOT EXISTS screens');
    expect(result.output).toContain('JSON NOT NULL');
    expect(result.output).toContain('AUTO_INCREMENT');
  });

  it('prints SQL Server DDL in dry-run mode without connecting', async () => {
    const result = await runInitStore({ dialect: 'sqlserver', dryRun: true });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('CREATE TABLE [screens]');
    expect(result.output).toContain("IF OBJECT_ID(N'screens', N'U') IS NULL");
    expect(result.output).toContain('NVARCHAR(MAX)');
    expect(result.output).toContain('[screen_versions]');
  });

  it('builds SQL Server connection config from explicit init-store flags', () => {
    expect(connectionFor({
      dialect: 'sqlserver',
      server: 'localhost',
      database: 'ReservaAlmuerzos',
      user: 'adm',
      password: '@sqlsql@',
      port: '1433',
      encrypt: 'false',
      trustServerCertificate: true,
    })).toEqual({
      server: 'localhost',
      database: 'ReservaAlmuerzos',
      user: 'adm',
      password: '@sqlsql@',
      port: 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });
  });

  it('fails loudly for unsupported dialects', async () => {
    const result = await runInitStore({ dialect: 'oracle' as never, dryRun: true });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Unsupported SQL dialect');
    expect(result.output).toContain('sqlserver, postgres, mysql, sqlite');
  });

  it('includes the target path when SQLite initialization fails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mythik-init-store-fail-'));
    const target = join(dir, 'missing-dir', 'mythik.db');

    const result = await runInitStore({ dialect: 'sqlite', target });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(target);
  });
});
