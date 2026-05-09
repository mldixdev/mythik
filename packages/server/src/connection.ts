import { createSqlDriver } from 'mythik/server';
import type { SqlDialect, SqlDriver, SqlDriverConfig } from 'mythik/server';
import type {
  ConnectionConfig,
  MysqlConnectionConfig,
  PostgresConnectionConfig,
  SqliteConnectionConfig,
  SqlServerConnectionConfig,
} from './types.js';
import { resolveEnvVars } from './spec-loader.js';

const warnedLegacyDefaultConfigs = new WeakSet<ConnectionConfig>();

function withoutType<T extends { type?: string }>(config: T): Omit<T, 'type'> {
  const { type: _type, ...rest } = config;
  return rest;
}

function normalizePort(value: unknown, fallback?: number): number | undefined {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveDatabaseDialect(config: ConnectionConfig, expectedDialect?: SqlDialect): SqlDialect {
  const declaredDialect = config.type ?? 'sqlserver';

  if (expectedDialect && declaredDialect !== expectedDialect) {
    throw new Error(`Database dialect mismatch: ApiSpec requested "${expectedDialect}" but database config is "${declaredDialect}".`);
  }

  if (!config.type && (!expectedDialect || expectedDialect === 'sqlserver') && !warnedLegacyDefaultConfigs.has(config)) {
    warnedLegacyDefaultConfigs.add(config);
    console.warn('Mythik server database config omitted "type"; defaulting to "sqlserver" for backwards compatibility.');
  }

  return expectedDialect ?? declaredDialect;
}

function sqlServerConnection(config: SqlServerConnectionConfig): Record<string, unknown> {
  const resolved = resolveEnvVars(config as unknown as Record<string, unknown>) as Record<string, unknown>;
  return {
    server: resolved.server as string,
    database: resolved.database as string,
    user: resolved.user as string | undefined,
    password: resolved.password as string | undefined,
    port: normalizePort(resolved.port, 1433),
    options: {
      trustServerCertificate: (resolved.trustServerCertificate as boolean) ?? true,
      trustedConnection: (resolved.trustedConnection as boolean) ?? false,
    },
  };
}

function postgresConnection(config: PostgresConnectionConfig): unknown {
  const resolved = resolveEnvVars(config as unknown as Record<string, unknown>) as unknown as PostgresConnectionConfig;
  if (resolved.connectionString) {
    return { ...withoutType(resolved), connectionString: resolved.connectionString };
  }
  return withoutType(resolved);
}

function mysqlConnection(config: MysqlConnectionConfig): unknown {
  const resolved = resolveEnvVars(config as unknown as Record<string, unknown>) as unknown as MysqlConnectionConfig;
  if (resolved.uri) {
    return resolved.uri;
  }
  return withoutType(resolved);
}

function sqliteConnection(config: SqliteConnectionConfig): unknown {
  const resolved = resolveEnvVars(config as unknown as Record<string, unknown>) as unknown as SqliteConnectionConfig;
  return withoutType(resolved);
}

export function toSqlDriverConfig(config: ConnectionConfig, expectedDialect?: SqlDialect): SqlDriverConfig {
  const dialect = resolveDatabaseDialect(config, expectedDialect);

  if (dialect === 'sqlserver') {
    return {
      dialect,
      connection: sqlServerConnection(config as SqlServerConnectionConfig),
    };
  }

  if (dialect === 'postgres') {
    return {
      dialect,
      connection: postgresConnection(config as PostgresConnectionConfig),
    };
  }

  if (dialect === 'mysql') {
    return {
      dialect,
      connection: mysqlConnection(config as MysqlConnectionConfig),
    };
  }

  return {
    dialect,
    connection: sqliteConnection(config as SqliteConnectionConfig),
  };
}

export function createDatabaseDriver(config: ConnectionConfig, expectedDialect?: SqlDialect): SqlDriver {
  return createSqlDriver(toSqlDriverConfig(config, expectedDialect));
}
