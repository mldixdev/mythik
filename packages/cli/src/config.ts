import fs from 'fs';
import path from 'path';
import type { SqlDialect } from 'mythik/server';

export const SUPPORTED_STORE_TYPES = [
  'supabase',
  'sqlserver',
  'postgres',
  'mysql',
  'sqlite',
  'file',
  'memory',
] as const;

export type MythikStoreType = (typeof SUPPORTED_STORE_TYPES)[number];

export interface MythikSqlConfig {
  dialect: SqlDialect;
  connection?: unknown;
  table?: string;
  versionsTable?: string;
  environmentsTable?: string;
  snapshotInterval?: number;
}

export interface MythikConfig {
  store: string;
  supabase?: { url: string; apiKey: string; table?: string };
  file?: { dir: string };
  sql?: MythikSqlConfig;
  sqlserver?: {
    server: string;
    database: string;
    user?: string;
    password?: string;
    port?: number;
    trustedConnection?: boolean;
    table?: string;
  };
}

export interface LoadConfigOptions {
  cwd?: string;
  flags?: Record<string, string>;
}

export function loadConfig(options: LoadConfigOptions = {}): MythikConfig {
  const cwd = options.cwd ?? process.cwd();
  const flags = options.flags ?? {};

  let config: MythikConfig;

  // Priority 1: CLI flags
  if (flags.store) {
    config = buildConfigFromFlags(flags);
  }
  // Priority 2: Env vars
  else if (process.env.MYTHIK_STORE) {
    config = buildConfigFromEnv();
  }
  // Priority 3: .mythikrc file (search upward)
  else {
    const rcPath = findRcFile(cwd);
    if (!rcPath) {
      throw new Error(
        `No configuration found\n\n` +
        `  Looked for .mythikrc from ${cwd} upward.\n` +
        `  Also checked: MYTHIK_STORE, MYTHIK_SUPABASE_URL env vars.\n\n` +
        `  Fix: run mythik init\n` +
        `       or create .mythikrc manually\n` +
        `       or pass --store, --url, --key flags`
      );
    }
    const raw = JSON.parse(fs.readFileSync(rcPath, 'utf-8')) as MythikConfig;
    config = resolveEnvVars(raw);
  }

  // --table flag overrides store table for any store type
  if (flags.table) {
    if (config.sql) config.sql.table = flags.table;
    if (config.sqlserver) config.sqlserver.table = flags.table;
    if (config.supabase) config.supabase.table = flags.table;
  }
  if (flags.versionsTable && config.sql) config.sql.versionsTable = flags.versionsTable;
  if (flags.environmentsTable && config.sql) config.sql.environmentsTable = flags.environmentsTable;
  if (flags.snapshotInterval && config.sql) {
    config.sql.snapshotInterval = parsePositiveInteger(flags.snapshotInterval, 'snapshotInterval');
  }

  return config;
}

export function withStoreTableOverride(config: MythikConfig, table: string): MythikConfig {
  const clone = structuredClone(config);
  if (clone.sql) clone.sql.table = table;
  if (clone.sqlserver) clone.sqlserver.table = table;
  if (clone.supabase) clone.supabase.table = table;
  return clone;
}

function findRcFile(startDir: string): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, '.mythikrc');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir || dir === root) return null;
    dir = parent;
  }
}

function buildConfigFromFlags(flags: Record<string, string>): MythikConfig {
  const config: MythikConfig = { store: flags.store };

  if (flags.store === 'supabase') {
    config.supabase = { url: flags.url ?? '', apiKey: flags.key ?? '' };
  } else if (flags.store === 'sqlserver') {
    config.sqlserver = {
      server: flags.server ?? flags.url ?? '',
      database: flags.database ?? flags.db ?? '',
      user: flags.user ?? undefined,
      password: flags.password ?? undefined,
      port: flags.port ? parsePositiveInteger(flags.port, 'port') : undefined,
    };
    config.sql = {
      dialect: 'sqlserver',
      connection: sqlServerConnectionFromLegacy(config.sqlserver),
    };
  } else if (flags.store === 'postgres' || flags.store === 'mysql') {
    config.sql = {
      dialect: flags.store,
      connection: flags.connection ?? flags.url ?? '',
    };
  } else if (flags.store === 'sqlite') {
    config.sql = {
      dialect: 'sqlite',
      connection: { filename: flags.filename ?? flags.target ?? flags.url ?? ':memory:' },
    };
  } else if (flags.store === 'file') {
    config.file = { dir: flags.dir ?? './specs' };
  }

  return config;
}

function buildConfigFromEnv(): MythikConfig {
  const store = process.env.MYTHIK_STORE!;
  const config: MythikConfig = { store };

  if (store === 'supabase') {
    config.supabase = {
      url: process.env.MYTHIK_SUPABASE_URL ?? '',
      apiKey: process.env.MYTHIK_API_KEY ?? '',
    };
  } else if (store === 'file') {
    config.file = { dir: process.env.MYTHIK_FILE_DIR ?? './specs' };
  } else if (store === 'postgres' || store === 'mysql') {
    config.sql = {
      dialect: store,
      connection: process.env.MYTHIK_DATABASE_URL ?? '',
    };
  } else if (store === 'sqlite') {
    config.sql = {
      dialect: 'sqlite',
      connection: { filename: process.env.MYTHIK_SQLITE_FILE ?? './mythik.db' },
    };
  } else if (store === 'sqlserver') {
    config.sqlserver = {
      server: process.env.MYTHIK_SQLSERVER_SERVER ?? '',
      database: process.env.MYTHIK_SQLSERVER_DATABASE ?? '',
      user: process.env.MYTHIK_SQLSERVER_USER || undefined,
      password: process.env.MYTHIK_SQLSERVER_PASSWORD || undefined,
      port: process.env.MYTHIK_SQLSERVER_PORT
        ? parsePositiveInteger(process.env.MYTHIK_SQLSERVER_PORT, 'MYTHIK_SQLSERVER_PORT')
        : undefined,
      trustedConnection: process.env.MYTHIK_SQLSERVER_TRUSTED_CONNECTION
        ? parseBoolean(process.env.MYTHIK_SQLSERVER_TRUSTED_CONNECTION)
        : undefined,
    };
    config.sql = {
      dialect: 'sqlserver',
      connection: sqlServerConnectionFromLegacy(config.sqlserver),
    };
  }

  if (process.env.MYTHIK_TABLE && config.sql) config.sql.table = process.env.MYTHIK_TABLE;
  if (process.env.MYTHIK_VERSIONS_TABLE && config.sql) config.sql.versionsTable = process.env.MYTHIK_VERSIONS_TABLE;
  if (process.env.MYTHIK_ENVIRONMENTS_TABLE && config.sql) {
    config.sql.environmentsTable = process.env.MYTHIK_ENVIRONMENTS_TABLE;
  }
  if (process.env.MYTHIK_SNAPSHOT_INTERVAL && config.sql) {
    config.sql.snapshotInterval = parsePositiveInteger(process.env.MYTHIK_SNAPSHOT_INTERVAL, 'MYTHIK_SNAPSHOT_INTERVAL');
  }

  return config;
}

export function resolveEnvVars(config: MythikConfig): MythikConfig {
  const clone = structuredClone(config);

  if (clone.supabase) {
    clone.supabase.url = resolveValue(clone.supabase.url);
    clone.supabase.apiKey = resolveValue(clone.supabase.apiKey);
  }
  if (clone.file) {
    clone.file.dir = resolveValue(clone.file.dir);
  }
  if (clone.sqlserver) {
    clone.sqlserver.server = resolveValue(clone.sqlserver.server);
    clone.sqlserver.database = resolveValue(clone.sqlserver.database);
    if (clone.sqlserver.user) clone.sqlserver.user = resolveValue(clone.sqlserver.user);
    if (clone.sqlserver.password) clone.sqlserver.password = resolveValue(clone.sqlserver.password);
  }
  if (clone.sql) {
    clone.sql = resolveSqlEnvVars(clone.sql);
  }

  normalizeSqlConfig(clone);

  return clone;
}

export function isSqlStoreType(store: string): store is SqlDialect {
  return store === 'sqlserver' || store === 'postgres' || store === 'mysql' || store === 'sqlite';
}

function resolveValue(value: string): string {
  if (!value.startsWith('$')) return value;
  const envName = value.slice(1);
  const resolved = process.env[envName];
  if (resolved === undefined) {
    throw new Error(
      `Environment variable ${envName} is not set (referenced as "${value}" in .mythikrc)`
    );
  }
  return resolved;
}

function resolveSqlEnvVars(config: MythikSqlConfig): MythikSqlConfig {
  const next = structuredClone(config);
  if (typeof next.connection === 'string') {
    next.connection = resolveValue(next.connection);
  } else if (next.connection && typeof next.connection === 'object' && !Array.isArray(next.connection)) {
    const connection = next.connection as Record<string, unknown>;
    for (const [key, value] of Object.entries(connection)) {
      if (typeof value === 'string') connection[key] = resolveValue(value);
    }
  }
  return next;
}

function normalizeSqlConfig(config: MythikConfig): void {
  if (!isSqlStoreType(config.store)) return;

  if (!config.sql) {
    if (config.store === 'sqlserver' && config.sqlserver) {
      config.sql = {
        dialect: 'sqlserver',
        connection: sqlServerConnectionFromLegacy(config.sqlserver),
        table: config.sqlserver.table,
      };
    } else {
      config.sql = { dialect: config.store };
    }
  }

  if (config.sql.dialect !== config.store) {
    config.sql = { ...config.sql, dialect: config.store };
  }
}

function sqlServerConnectionFromLegacy(sqlserver: NonNullable<MythikConfig['sqlserver']>): Record<string, unknown> {
  const connection: Record<string, unknown> = {
    server: sqlserver.server,
    database: sqlserver.database,
  };
  if (sqlserver.user) connection.user = sqlserver.user;
  if (sqlserver.password) connection.password = sqlserver.password;
  if (sqlserver.port) connection.port = sqlserver.port;
  if (sqlserver.trustedConnection !== undefined) connection.trustedConnection = sqlserver.trustedConnection;
  return connection;
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
