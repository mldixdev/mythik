import { SqlSpecStore } from './sql.js';
import { createSqlDriver } from '../sql/index.js';
import type { SqlDriver } from '../sql/index.js';

export interface SqlServerSpecStoreConfig {
  server: string;
  database: string;
  user?: string;
  password?: string;
  port?: number;
  /** Use Windows Authentication (trusted connection). Default: false */
  trustedConnection?: boolean;
  /** Trust self-signed certificates. Default: true for local dev */
  trustServerCertificate?: boolean;
  /** Table name for spec storage. Default: 'screens' */
  table?: string;
}

export function createSqlServerDriverFromConfig(config: SqlServerSpecStoreConfig): SqlDriver {
  return createSqlDriver({
    dialect: 'sqlserver',
    connection: {
      server: config.server,
      database: config.database,
      user: config.user,
      password: config.password,
      port: config.port ?? 1433,
      options: {
        trustServerCertificate: config.trustServerCertificate ?? true,
        trustedConnection: config.trustedConnection ?? false,
      },
    },
  });
}

export class SqlServerSpecStore extends SqlSpecStore {
  constructor(config: SqlServerSpecStoreConfig) {
    super({
      driver: createSqlServerDriverFromConfig(config),
      table: config.table,
      closeDriver: true,
    });
  }
}
