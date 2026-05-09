// mythik/server — Node-only spec store implementations.
//
// Entry point for server-side code. Browser code must import from
// 'mythik' (the default entry), which is browser-safe by construction.

export { FileSpecStore } from './spec-stores/file.js';

export { SqlSpecStore } from './spec-stores/sql.js';
export type { SqlSpecStoreConfig } from './spec-stores/sql.js';

export { SqlVersionedSpecStore, SqlEnvironmentStore } from './spec-stores/sql-versioned.js';
export type { SqlVersionedSpecStoreConfig, SqlEnvironmentStoreConfig } from './spec-stores/sql-versioned.js';

export { SqlServerSpecStore } from './spec-stores/sqlserver.js';
export type { SqlServerSpecStoreConfig } from './spec-stores/sqlserver.js';

export { SqlServerVersionedSpecStore, SqlServerEnvironmentStore } from './spec-stores/sqlserver-versioned.js';
export type {
  SqlServerVersionedSpecStoreConfig,
  SqlServerEnvironmentStoreConfig,
} from './spec-stores/sqlserver-versioned.js';

export { createSqlDriver, getSqlStoreDdl, SQL_STORE_DDL, SqlDriverError } from './sql/index.js';
export type { SqlStoreTable } from './sql/index.js';
export type {
  SqlCapabilities,
  SqlDialect,
  SqlDriver,
  SqlDriverConfig,
  SqlDriverErrorOptions,
  SqlMutationResult,
  SqlParams,
  SqlStatement,
  SqlTransaction,
} from './sql/index.js';
