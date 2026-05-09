import { compileNamedParams as compileSqlNamedParams } from '../named-params.js';
import { SqlDriverError } from '../errors.js';
import type { SqlDriver, SqlDriverConfig, SqlMutationResult, SqlParams, SqlStatement, SqlTransaction } from '../types.js';

interface MysqlPool {
  execute(statement: string, values?: readonly unknown[]): Promise<[unknown, unknown[]]>;
  end(): Promise<void>;
  getConnection(): Promise<MysqlConnection>;
}

interface MysqlConnection {
  execute(statement: string, values?: readonly unknown[]): Promise<[unknown, unknown[]]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

interface MysqlModuleShape {
  createPool(config?: unknown): MysqlPool;
}

type MysqlModuleImport = MysqlModuleShape & { default?: MysqlModuleShape };

export interface MysqlDriverDeps {
  loadMysql?: () => Promise<MysqlModuleImport>;
}

const MYSQL_CAPABILITIES = {
  dialect: 'mysql',
  namedParams: true,
  positionalParams: true,
  nativeJson: true,
  nativeBoolean: false,
  returning: false,
  upsert: true,
  transactions: true,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function connectionConfig(connection: unknown): unknown {
  return isRecord(connection) || typeof connection === 'string' ? connection : {};
}

function trimStatement(statement: string): string {
  return statement.trim().replace(/;\s*$/, '');
}

function hasOrderBy(statement: string): boolean {
  return /\border\s+by\b/i.test(statement);
}

function whereClause(where: SqlStatement): string {
  const sql = trimStatement(where.sql);
  return /^where\b/i.test(sql) ? sql : `WHERE ${sql}`;
}

function requireIdentifier(identifier: string): string {
  if (identifier.trim() === '') {
    throw new SqlDriverError('MySQL identifier cannot be empty.', {
      code: 'SQL_IDENTIFIER_INVALID',
      dialect: 'mysql',
    });
  }
  return identifier;
}

function normalizeModule(mod: MysqlModuleImport): MysqlModuleShape {
  return mod.default ?? mod;
}

async function loadMysqlModule(): Promise<MysqlModuleImport> {
  try {
    return (await import('mysql2/promise')) as unknown as MysqlModuleImport;
  } catch (error) {
    throw new SqlDriverError('MySQL support requires the optional dependency "mysql2".', {
      code: 'SQL_DRIVER_DEPENDENCY_MISSING',
      dialect: 'mysql',
      cause: error,
    });
  }
}

function mysqlValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function mysqlParams(params: SqlParams | undefined): readonly unknown[] | undefined {
  if (params === undefined) return undefined;
  if (Array.isArray(params)) return params.map(mysqlValue);
  throw new SqlDriverError('MySQL driver requires positional params after compilation.', {
    code: 'SQL_PARAMS_INVALID',
    dialect: 'mysql',
  });
}

function normalizeStatement(statement: string | SqlStatement, params?: SqlParams): SqlStatement {
  const source = typeof statement === 'string' ? { sql: statement, params } : statement;
  if (isRecord(source.params)) {
    return compileSqlNamedParams('mysql', source.sql, source.params);
  }
  return source;
}

function requireObjectParams(statement: SqlStatement, purpose: string): Record<string, unknown> {
  if (statement.params === undefined) return {};
  if (!isRecord(statement.params)) {
    throw new SqlDriverError(`${purpose} requires named object params.`, {
      code: 'SQL_PARAMS_INVALID',
      dialect: 'mysql',
    });
  }
  return statement.params;
}

function uniqueParamName(base: string, used: Set<string>): string {
  const safeBase = base.replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]+/, '') || 'value';
  let name = safeBase;
  let suffix = 1;
  while (used.has(name)) {
    suffix += 1;
    name = `${safeBase}_${suffix}`;
  }
  used.add(name);
  return name;
}

function rowsFromResult<Row>(result: unknown): Row[] {
  return Array.isArray(result) ? (result as Row[]) : [];
}

function affectedRows(result: unknown, rowsLength: number): number {
  if (isRecord(result) && typeof result.affectedRows === 'number') return result.affectedRows;
  return rowsLength;
}

function insertId(result: unknown): unknown {
  if (isRecord(result) && Object.prototype.hasOwnProperty.call(result, 'insertId')) return result.insertId;
  return undefined;
}

export function createMysqlDriver(config: SqlDriverConfig, deps: MysqlDriverDeps = {}): SqlDriver {
  let mysqlModule: MysqlModuleShape | undefined;
  let poolInstance: MysqlPool | undefined;
  const loadMysql = deps.loadMysql ?? loadMysqlModule;

  function mapError(error: unknown, code = 'SQL_DRIVER_QUERY_FAILED'): Error {
    if (error instanceof SqlDriverError) return error;
    return new SqlDriverError(error instanceof Error ? error.message : 'MySQL driver error.', {
      code,
      dialect: 'mysql',
      cause: error,
    });
  }

  async function mysql(): Promise<MysqlModuleShape> {
    if (mysqlModule) return mysqlModule;
    try {
      mysqlModule = normalizeModule(await loadMysql());
      return mysqlModule;
    } catch (error) {
      if (error instanceof SqlDriverError) throw error;
      throw new SqlDriverError('MySQL support requires the optional dependency "mysql2".', {
        code: 'SQL_DRIVER_DEPENDENCY_MISSING',
        dialect: 'mysql',
        cause: error,
      });
    }
  }

  async function pool(): Promise<MysqlPool> {
    if (poolInstance) return poolInstance;
    const mod = await mysql();
    poolInstance = mod.createPool(connectionConfig(config.connection));
    return poolInstance;
  }

  async function runQuery<Row>(target: MysqlPool | MysqlConnection | undefined, statement: string | SqlStatement, params?: SqlParams): Promise<Row[]> {
    const normalized = normalizeStatement(statement, params);
    const source = target ?? (await pool());
    const [result] = await source.execute(normalized.sql, mysqlParams(normalized.params));
    return rowsFromResult<Row>(result);
  }

  async function runExec<Row>(
    target: MysqlPool | MysqlConnection | undefined,
    statement: string | SqlStatement,
    params?: SqlParams,
  ): Promise<SqlMutationResult<Row>> {
    const normalized = normalizeStatement(statement, params);
    const source = target ?? (await pool());
    const [result] = await source.execute(normalized.sql, mysqlParams(normalized.params));
    const rows = rowsFromResult<Row>(result);
    return {
      rows,
      affectedRows: affectedRows(result, rows.length),
      insertId: insertId(result),
    };
  }

  const driver: SqlDriver = {
    dialect: 'mysql',
    capabilities: MYSQL_CAPABILITIES,

    async connect(): Promise<void> {
      await pool();
    },

    async close(): Promise<void> {
      await poolInstance?.end();
      poolInstance = undefined;
    },

    async query<Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams): Promise<Row[]> {
      try {
        return await runQuery<Row>(undefined, statement, params);
      } catch (error) {
        throw mapError(error);
      }
    },

    async exec<Row = Record<string, unknown>>(
      statement: string | SqlStatement,
      params?: SqlParams,
    ): Promise<SqlMutationResult<Row>> {
      try {
        return await runExec<Row>(undefined, statement, params);
      } catch (error) {
        throw mapError(error);
      }
    },

    async transaction<T>(run: (tx: SqlTransaction) => Promise<T>): Promise<T> {
      const connection = await (await pool()).getConnection();
      await connection.beginTransaction();
      try {
        const result = await run({
          query: <Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams) =>
            runQuery<Row>(connection, statement, params),
          exec: <Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams) =>
            runExec<Row>(connection, statement, params),
        });
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    quoteIdent(identifier: string): string {
      return `\`${requireIdentifier(identifier).replace(/`/g, '``')}\``;
    },

    quoteQualified(...identifiers: string[]): string {
      return identifiers.map((identifier) => driver.quoteIdent(identifier)).join('.');
    },

    compileNamedParams(statement: string, params: Record<string, unknown>): SqlStatement {
      return compileSqlNamedParams('mysql', statement, params);
    },

    paginate(statement: string, limit: number, offset: number): string {
      const cleanLimit = Math.trunc(limit);
      const cleanOffset = Math.trunc(offset);
      if (!Number.isFinite(cleanLimit) || cleanLimit < 0 || !Number.isFinite(cleanOffset) || cleanOffset < 0) {
        throw new SqlDriverError('MySQL pagination limit and offset must be finite non-negative numbers.', {
          code: 'SQL_PAGINATION_INVALID',
          dialect: 'mysql',
        });
      }
      const base = trimStatement(statement);
      const ordered = hasOrderBy(base) ? base : `${base} ORDER BY 1`;
      return `${ordered} LIMIT ${cleanLimit} OFFSET ${cleanOffset}`;
    },

    countQuery(statement: string): string {
      return `SELECT COUNT(*) AS total FROM (${trimStatement(statement)}) AS _mythik_count`;
    },

    totalsQuery(statement: string): string {
      return `SELECT * FROM (${trimStatement(statement)}) AS _mythik_totals`;
    },

    buildInsertReturning(table: string, values: Record<string, unknown>): SqlStatement {
      const columns = Object.keys(values);
      if (columns.length === 0) {
        throw new SqlDriverError('MySQL insert requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'mysql',
        });
      }

      const used = new Set<string>();
      const params: Record<string, unknown> = {};
      const placeholders = columns.map((column) => {
        const name = uniqueParamName(column, used);
        params[name] = values[column];
        return `@${name}`;
      });

      return {
        sql: `INSERT INTO ${driver.quoteIdent(table)} (${columns.map((column) => driver.quoteIdent(column)).join(', ')}) VALUES (${placeholders.join(', ')})`,
        params,
      };
    },

    buildUpdateReturning(table: string, values: Record<string, unknown>, where: SqlStatement): SqlStatement {
      const columns = Object.keys(values);
      if (columns.length === 0) {
        throw new SqlDriverError('MySQL update requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'mysql',
        });
      }

      const params = { ...requireObjectParams(where, 'MySQL update') };
      const used = new Set(Object.keys(params));
      const assignments = columns.map((column) => {
        const name = uniqueParamName(`set_${column}`, used);
        params[name] = values[column];
        return `${driver.quoteIdent(column)} = @${name}`;
      });

      return {
        sql: `UPDATE ${driver.quoteIdent(table)} SET ${assignments.join(', ')} ${whereClause(where)}`,
        params,
      };
    },

    buildDelete(table: string, where: SqlStatement): SqlStatement {
      return {
        sql: `DELETE FROM ${driver.quoteIdent(table)} ${whereClause(where)}`,
        params: where.params,
      };
    },

    buildUpsert(table: string, values: Record<string, unknown>, keys: string[]): SqlStatement {
      const columns = Object.keys(values);
      if (columns.length === 0) {
        throw new SqlDriverError('MySQL upsert requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'mysql',
        });
      }
      if (keys.length === 0) {
        throw new SqlDriverError('MySQL upsert requires at least one conflict key.', {
          code: 'SQL_KEYS_EMPTY',
          dialect: 'mysql',
        });
      }

      const insert = driver.buildInsertReturning(table, values);
      const updateColumns = columns.filter((column) => !keys.includes(column));
      const insertWithAlias = `${insert.sql} AS _mythik_upsert`;
      const assignments =
        updateColumns.length === 0
          ? [`${driver.quoteIdent(keys[0]!)} = _mythik_upsert.${driver.quoteIdent(keys[0]!)}`]
          : updateColumns.map((column) => `${driver.quoteIdent(column)} = _mythik_upsert.${driver.quoteIdent(column)}`);

      return {
        sql: `${insertWithAlias} ON DUPLICATE KEY UPDATE ${assignments.join(', ')}`,
        params: insert.params,
      };
    },

    async tableExists(table: string): Promise<boolean> {
      const [schema, name] = table.includes('.') ? table.split('.', 2) : [null, table];
      const rows = await driver.query(
        'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = COALESCE(@schema, DATABASE()) AND TABLE_NAME = @name',
        { schema, name },
      );
      return rows.length > 0;
    },

    mapError,
  };

  return driver;
}
