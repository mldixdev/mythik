import { createMysqlDriver } from './drivers/mysql.js';
import { createPostgresDriver } from './drivers/postgres.js';
import { createSqliteDriver } from './drivers/sqlite.js';
import { createSqlServerDriver } from './drivers/sqlserver.js';
import { SqlDriverError } from './errors.js';
import type { SqlDriver, SqlDriverConfig } from './types.js';

export function createSqlDriver(config: SqlDriverConfig): SqlDriver {
  if (config.dialect === 'sqlite') {
    return createSqliteDriver(config);
  }

  if (config.dialect === 'sqlserver') {
    return createSqlServerDriver(config);
  }

  if (config.dialect === 'postgres') {
    return createPostgresDriver(config);
  }

  if (config.dialect === 'mysql') {
    return createMysqlDriver(config);
  }

  throw new SqlDriverError(`SQL driver "${String(config.dialect)}" is not implemented yet.`, {
    code: 'SQL_DRIVER_NOT_IMPLEMENTED',
    dialect: config.dialect,
  });
}
