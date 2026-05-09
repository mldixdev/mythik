import { SqlEnvironmentStore, SqlVersionedSpecStore, type SqlEnvironmentStoreConfig } from './sql-versioned.js';
import { createSqlServerDriverFromConfig, type SqlServerSpecStoreConfig } from './sqlserver.js';

export interface SqlServerVersionedSpecStoreConfig extends SqlServerSpecStoreConfig {
  /** Table for version history. Default: 'screen_versions' */
  versionsTable?: string;
  /** Snapshot interval (full spec stored every N versions). Default: 10 */
  snapshotInterval?: number;
}

export class SqlServerVersionedSpecStore extends SqlVersionedSpecStore {
  constructor(config: SqlServerVersionedSpecStoreConfig) {
    super({
      driver: createSqlServerDriverFromConfig(config),
      table: config.table,
      versionsTable: config.versionsTable,
      snapshotInterval: config.snapshotInterval,
      closeDriver: true,
    });
  }
}

export interface SqlServerEnvironmentStoreConfig extends Omit<SqlServerSpecStoreConfig, 'table'> {
  /** Table name. Default: 'screen_environments' */
  table?: string;
}

export class SqlServerEnvironmentStore extends SqlEnvironmentStore {
  constructor(config: SqlServerEnvironmentStoreConfig) {
    const sqlConfig: SqlEnvironmentStoreConfig = {
      driver: createSqlServerDriverFromConfig(config),
      table: config.table,
      closeDriver: true,
    };
    super(sqlConfig);
  }
}
