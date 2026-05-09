import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, resolveEnvVars, withStoreTableOverride } from '../src/config.js';
import { resolveStore } from '../src/stores/resolver.js';
import { MemorySpecStore } from 'mythik';
import { SqlSpecStore } from 'mythik/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('resolveEnvVars', () => {
  beforeEach(() => {
    process.env.TEST_VAR = 'resolved_value';
  });
  afterEach(() => {
    delete process.env.TEST_VAR;
  });

  it('resolves $VAR references to env values', () => {
    const config = { store: 'supabase', supabase: { url: 'https://x.co', apiKey: '$TEST_VAR' } };
    const resolved = resolveEnvVars(config);
    expect(resolved.supabase!.apiKey).toBe('resolved_value');
  });

  it('leaves non-$ values unchanged', () => {
    const config = { store: 'supabase', supabase: { url: 'https://x.co', apiKey: 'literal' } };
    const resolved = resolveEnvVars(config);
    expect(resolved.supabase!.apiKey).toBe('literal');
  });

  it('throws when env var is not set', () => {
    const config = { store: 'supabase', supabase: { url: 'https://x.co', apiKey: '$MISSING_VAR' } };
    expect(() => resolveEnvVars(config)).toThrow('MISSING_VAR');
  });
});

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mythik-test-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
    delete process.env.MYTHIK_STORE;
    delete process.env.MYTHIK_FILE_DIR;
    delete process.env.MYTHIK_DATABASE_URL;
    delete process.env.MYTHIK_SQLITE_FILE;
    delete process.env.MYTHIK_SQLSERVER_SERVER;
    delete process.env.MYTHIK_SQLSERVER_DATABASE;
  });

  it('reads .mythikrc from given directory', () => {
    fs.writeFileSync(path.join(tmpDir, '.mythikrc'), JSON.stringify({ store: 'memory' }));
    const config = loadConfig({ cwd: tmpDir });
    expect(config.store).toBe('memory');
  });

  it('searches upward for .mythikrc', () => {
    const subDir = path.join(tmpDir, 'a', 'b');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.mythikrc'), JSON.stringify({ store: 'memory' }));
    const config = loadConfig({ cwd: subDir });
    expect(config.store).toBe('memory');
  });

  it('CLI flags override file values', () => {
    fs.writeFileSync(path.join(tmpDir, '.mythikrc'), JSON.stringify({ store: 'memory' }));
    const config = loadConfig({ cwd: tmpDir, flags: { store: 'file', dir: './specs' } });
    expect(config.store).toBe('file');
  });

  it('accepts every public store type from flags', () => {
    expect(loadConfig({ cwd: tmpDir, flags: { store: 'memory' } }).store).toBe('memory');
    expect(loadConfig({ cwd: tmpDir, flags: { store: 'file', dir: './specs' } }).store).toBe('file');
    expect(loadConfig({ cwd: tmpDir, flags: { store: 'supabase', url: 'https://x.co', key: 'secret' } }).store).toBe('supabase');
    expect(loadConfig({ cwd: tmpDir, flags: { store: 'sqlserver', server: 'db', database: 'mythik' } }).sql?.dialect).toBe('sqlserver');
    expect(loadConfig({ cwd: tmpDir, flags: { store: 'postgres', url: 'postgres://localhost/mythik' } }).sql?.dialect).toBe('postgres');
    expect(loadConfig({ cwd: tmpDir, flags: { store: 'mysql', url: 'mysql://localhost/mythik' } }).sql?.dialect).toBe('mysql');
    expect(loadConfig({ cwd: tmpDir, flags: { store: 'sqlite', filename: './mythik.db' } }).sql).toEqual({
      dialect: 'sqlite',
      connection: { filename: './mythik.db' },
    });
  });

  it('env vars override file values', () => {
    fs.writeFileSync(path.join(tmpDir, '.mythikrc'), JSON.stringify({ store: 'memory' }));
    process.env.MYTHIK_STORE = 'file';
    process.env.MYTHIK_FILE_DIR = './specs';
    const config = loadConfig({ cwd: tmpDir });
    expect(config.store).toBe('file');
    delete process.env.MYTHIK_STORE;
    delete process.env.MYTHIK_FILE_DIR;
  });

  it('env vars configure SQL dialect stores', () => {
    process.env.MYTHIK_STORE = 'postgres';
    process.env.MYTHIK_DATABASE_URL = 'postgres://localhost/mythik';
    expect(loadConfig({ cwd: tmpDir }).sql).toEqual({
      dialect: 'postgres',
      connection: 'postgres://localhost/mythik',
    });

    process.env.MYTHIK_STORE = 'mysql';
    process.env.MYTHIK_DATABASE_URL = 'mysql://localhost/mythik';
    expect(loadConfig({ cwd: tmpDir }).sql).toEqual({
      dialect: 'mysql',
      connection: 'mysql://localhost/mythik',
    });

    process.env.MYTHIK_STORE = 'sqlite';
    delete process.env.MYTHIK_DATABASE_URL;
    process.env.MYTHIK_SQLITE_FILE = './local.db';
    expect(loadConfig({ cwd: tmpDir }).sql).toEqual({
      dialect: 'sqlite',
      connection: { filename: './local.db' },
    });

    process.env.MYTHIK_STORE = 'sqlserver';
    process.env.MYTHIK_SQLSERVER_SERVER = 'sql.local';
    process.env.MYTHIK_SQLSERVER_DATABASE = 'mythik';
    expect(loadConfig({ cwd: tmpDir }).sql).toEqual({
      dialect: 'sqlserver',
      connection: { server: 'sql.local', database: 'mythik' },
    });

    delete process.env.MYTHIK_STORE;
    delete process.env.MYTHIK_DATABASE_URL;
    delete process.env.MYTHIK_SQLITE_FILE;
    delete process.env.MYTHIK_SQLSERVER_SERVER;
    delete process.env.MYTHIK_SQLSERVER_DATABASE;
  });

  it('throws with helpful message when no config found', () => {
    expect(() => loadConfig({ cwd: tmpDir })).toThrow('No configuration found');
  });
});

describe('resolveStore', () => {
  it('returns MemorySpecStore for store=memory', () => {
    const store = resolveStore({ store: 'memory' });
    expect(store).toBeInstanceOf(MemorySpecStore);
  });

  it('returns driver-backed stores for SQL dialect store types', () => {
    for (const storeType of ['sqlserver', 'postgres', 'mysql', 'sqlite'] as const) {
      const store = resolveStore({
        store: storeType,
        sql: {
          dialect: storeType,
          connection: storeType === 'sqlite' ? { filename: ':memory:' } : 'postgres://localhost/mythik',
        },
      });
      expect(store).toBeInstanceOf(SqlSpecStore);
    }
  });

  it('throws for unknown store type', () => {
    expect(() => resolveStore({ store: 'redis' } as any)).toThrow('Unknown store');
    expect(() => resolveStore({ store: 'redis' } as any)).toThrow('supabase, sqlserver, postgres, mysql, sqlite, file, memory');
  });
});

describe('withStoreTableOverride', () => {
  it('overrides generic SQL store tables without mutating the base config', () => {
    const base = {
      store: 'postgres',
      sql: {
        dialect: 'postgres' as const,
        connection: 'postgres://localhost/mythik',
        table: 'screens',
      },
    };

    const next = withStoreTableOverride(base, 'api_specs');

    expect(next.sql?.table).toBe('api_specs');
    expect(base.sql.table).toBe('screens');
  });

  it('keeps legacy SQL Server and Supabase table overrides in sync', () => {
    const next = withStoreTableOverride(
      {
        store: 'sqlserver',
        sql: { dialect: 'sqlserver', connection: { server: 'db', database: 'mythik' }, table: 'screens' },
        sqlserver: { server: 'db', database: 'mythik', table: 'screens' },
        supabase: { url: 'https://example.supabase.co', apiKey: 'secret', table: 'screens' },
      },
      'api_specs',
    );

    expect(next.sql?.table).toBe('api_specs');
    expect(next.sqlserver?.table).toBe('api_specs');
    expect(next.supabase?.table).toBe('api_specs');
  });
});
