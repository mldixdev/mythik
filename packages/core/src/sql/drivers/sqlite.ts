import { compileNamedParams as compileSqlNamedParams } from '../named-params.js';
import { missingSqlDriverDependencyError, SqlDriverError } from '../errors.js';
import type { SqlDriver, SqlDriverConfig, SqlMutationResult, SqlParams, SqlStatement, SqlTransaction } from '../types.js';

type SqlitePrimitive = string | number | bigint | Buffer | null;
type SqliteParams = Record<string, SqlitePrimitive> | SqlitePrimitive[];

interface BetterSqliteRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

interface BetterSqliteStatement {
  all(...params: SqlitePrimitive[]): Record<string, unknown>[];
  all(params: Record<string, SqlitePrimitive>): Record<string, unknown>[];
  get(...params: SqlitePrimitive[]): Record<string, unknown> | undefined;
  get(params: Record<string, SqlitePrimitive>): Record<string, unknown> | undefined;
  run(...params: SqlitePrimitive[]): BetterSqliteRunResult;
  run(params: Record<string, SqlitePrimitive>): BetterSqliteRunResult;
}

interface BetterSqliteDatabase {
  prepare(sql: string): BetterSqliteStatement;
  exec(sql: string): void;
  close(): void;
}

interface BetterSqliteConstructor {
  new (filename?: string, options?: Record<string, unknown>): BetterSqliteDatabase;
}

export interface SqliteDriverDeps {
  loadDatabase?: () => Promise<BetterSqliteConstructor>;
}

interface SqliteConnectionOptions {
  filename?: string;
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
}

const SQLITE_CAPABILITIES = {
  dialect: 'sqlite',
  namedParams: true,
  positionalParams: true,
  nativeJson: false,
  nativeBoolean: false,
  returning: true,
  upsert: true,
  transactions: true,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sqliteConnectionOptions(connection: unknown): SqliteConnectionOptions {
  if (typeof connection === 'string') {
    return { filename: connection };
  }
  if (isRecord(connection)) {
    return connection;
  }
  return {};
}

function sqliteValue(value: unknown): SqlitePrimitive {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint') return value;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

function sqliteParams(params: SqlParams | undefined): SqliteParams | undefined {
  if (params === undefined) return undefined;
  if (Array.isArray(params)) return params.map(sqliteValue);

  const normalized: Record<string, SqlitePrimitive> = {};
  for (const [key, value] of Object.entries(params)) {
    normalized[key] = sqliteValue(value);
  }
  return normalized;
}

function bindAll(statement: BetterSqliteStatement, params: SqliteParams | undefined): Record<string, unknown>[] {
  if (params === undefined) return statement.all();
  if (Array.isArray(params)) return statement.all(...params);
  return statement.all(params);
}

function bindRun(statement: BetterSqliteStatement, params: SqliteParams | undefined): BetterSqliteRunResult {
  if (params === undefined) return statement.run();
  if (Array.isArray(params)) return statement.run(...params);
  return statement.run(params);
}

function isPlainSqlParams(params: SqlParams | undefined): params is Record<string, unknown> {
  return params !== undefined && !Array.isArray(params);
}

function hasReturning(statement: string): boolean {
  return /\breturning\b/i.test(statement);
}

function isScript(statement: string, params: SqlParams | undefined): boolean {
  return params === undefined && /;\s*\S/.test(statement.trim());
}

function trimStatement(statement: string): string {
  return statement.trim().replace(/;\s*$/, '');
}

function hasOrderBy(statement: string): boolean {
  return /\border\s+by\b/i.test(statement);
}

function normalizeStatement(statement: string | SqlStatement, params?: SqlParams): SqlStatement {
  const source = typeof statement === 'string' ? { sql: statement, params } : statement;
  if (isPlainSqlParams(source.params)) {
    return compileSqlNamedParams('sqlite', source.sql, source.params);
  }
  return source;
}

function requireIdentifier(identifier: string): string {
  if (identifier.trim() === '') {
    throw new SqlDriverError('SQL identifier cannot be empty.', {
      code: 'SQL_IDENTIFIER_INVALID',
      dialect: 'sqlite',
    });
  }
  return identifier;
}

function whereClause(where: SqlStatement): string {
  const sql = trimStatement(where.sql);
  return /^where\b/i.test(sql) ? sql : `WHERE ${sql}`;
}

function requireObjectParams(statement: SqlStatement, purpose: string): Record<string, unknown> {
  if (statement.params === undefined) return {};
  if (!isRecord(statement.params)) {
    throw new SqlDriverError(`${purpose} requires named object params.`, {
      code: 'SQL_PARAMS_INVALID',
      dialect: 'sqlite',
    });
  }
  return statement.params;
}

function resultInsertId(rows: Record<string, unknown>[], fallback: unknown): unknown {
  if (fallback !== undefined) return fallback;
  const first = rows[0];
  if (first && Object.prototype.hasOwnProperty.call(first, 'id')) return first.id;
  return undefined;
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

async function loadBetterSqlite(): Promise<BetterSqliteConstructor> {
  try {
    const mod = await import('better-sqlite3');
    return mod.default;
  } catch (error) {
    throw missingSqlDriverDependencyError({
      label: 'SQLite',
      dialect: 'sqlite',
      packageName: 'better-sqlite3',
      cause: error,
    });
  }
}

export function createSqliteDriver(config: SqlDriverConfig, deps: SqliteDriverDeps = {}): SqlDriver {
  let db: BetterSqliteDatabase | undefined;
  const loadDatabase = deps.loadDatabase ?? loadBetterSqlite;

  function mapError(error: unknown, code = 'SQL_DRIVER_QUERY_FAILED'): Error {
    if (error instanceof SqlDriverError) return error;
    return new SqlDriverError(error instanceof Error ? error.message : 'SQLite driver error.', {
      code,
      dialect: 'sqlite',
      cause: error,
    });
  }

  async function database(): Promise<BetterSqliteDatabase> {
    if (db) return db;
    let Database: BetterSqliteConstructor;
    try {
      Database = await loadDatabase();
    } catch (error) {
      if (error instanceof SqlDriverError) throw error;
      throw missingSqlDriverDependencyError({
        label: 'SQLite',
        dialect: 'sqlite',
        packageName: 'better-sqlite3',
        cause: error,
      });
    }
    const { filename = ':memory:', ...options } = sqliteConnectionOptions(config.connection);
    db = new Database(filename, options);
    return db;
  }

  const driver: SqlDriver = {
    dialect: 'sqlite',
    capabilities: SQLITE_CAPABILITIES,

    async connect(): Promise<void> {
      await database();
    },

    async close(): Promise<void> {
      db?.close();
      db = undefined;
    },

    async query<Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams): Promise<Row[]> {
      try {
        const currentDb = await database();
        return runQueryOn<Row>(currentDb, statement, params);
      } catch (error) {
        throw mapError(error);
      }
    },

    async exec<Row = Record<string, unknown>>(
      statement: string | SqlStatement,
      params?: SqlParams,
    ): Promise<SqlMutationResult<Row>> {
      try {
        const currentDb = await database();
        return runExecOn<Row>(currentDb, statement, params);
      } catch (error) {
        throw mapError(error);
      }
    },

    async transaction<T>(run: (tx: SqlTransaction) => Promise<T>): Promise<T> {
      const currentDb = await database();
      currentDb.exec('BEGIN');
      try {
        const tx: SqlTransaction = {
          query: async <Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams) => {
            try {
              return runQueryOn<Row>(currentDb, statement, params);
            } catch (error) {
              throw mapError(error);
            }
          },
          exec: async <Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams) => {
            try {
              return runExecOn<Row>(currentDb, statement, params);
            } catch (error) {
              throw mapError(error);
            }
          },
        };
        const result = await run(tx);
        currentDb.exec('COMMIT');
        return result;
      } catch (error) {
        currentDb.exec('ROLLBACK');
        throw error;
      }
    },

    quoteIdent(identifier: string): string {
      return `"${requireIdentifier(identifier).replace(/"/g, '""')}"`;
    },

    quoteQualified(...identifiers: string[]): string {
      return identifiers.map((identifier) => driver.quoteIdent(identifier)).join('.');
    },

    compileNamedParams(statement: string, params: Record<string, unknown>): SqlStatement {
      return compileSqlNamedParams('sqlite', statement, params);
    },

    paginate(statement: string, limit: number, offset: number): string {
      const cleanLimit = Math.trunc(limit);
      const cleanOffset = Math.trunc(offset);
      if (!Number.isFinite(cleanLimit) || cleanLimit < 0 || !Number.isFinite(cleanOffset) || cleanOffset < 0) {
        throw new SqlDriverError('SQLite pagination limit and offset must be finite non-negative numbers.', {
          code: 'SQL_PAGINATION_INVALID',
          dialect: 'sqlite',
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

    buildInsertReturning(table: string, values: Record<string, unknown>, returning = ['*']): SqlStatement {
      const columns = Object.keys(values);
      if (columns.length === 0) {
        throw new SqlDriverError('SQLite insert requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'sqlite',
        });
      }

      const used = new Set<string>();
      const params: Record<string, unknown> = {};
      const placeholders = columns.map((column) => {
        const name = uniqueParamName(column, used);
        params[name] = values[column];
        return `@${name}`;
      });
      const projection = returning.includes('*') ? '*' : returning.map((column) => driver.quoteIdent(column)).join(', ');

      return {
        sql: `INSERT INTO ${driver.quoteIdent(table)} (${columns.map((column) => driver.quoteIdent(column)).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING ${projection}`,
        params,
      };
    },

    buildUpdateReturning(
      table: string,
      values: Record<string, unknown>,
      where: SqlStatement,
      returning = ['*'],
    ): SqlStatement {
      const columns = Object.keys(values);
      if (columns.length === 0) {
        throw new SqlDriverError('SQLite update requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'sqlite',
        });
      }

      const params = { ...requireObjectParams(where, 'SQLite update') };
      const used = new Set(Object.keys(params));
      const assignments = columns.map((column) => {
        const name = uniqueParamName(`set_${column}`, used);
        params[name] = values[column];
        return `${driver.quoteIdent(column)} = @${name}`;
      });
      const projection = returning.includes('*') ? '*' : returning.map((column) => driver.quoteIdent(column)).join(', ');

      return {
        sql: `UPDATE ${driver.quoteIdent(table)} SET ${assignments.join(', ')} ${whereClause(where)} RETURNING ${projection}`,
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
      if (keys.length === 0) {
        throw new SqlDriverError('SQLite upsert requires at least one conflict key.', {
          code: 'SQL_KEYS_EMPTY',
          dialect: 'sqlite',
        });
      }

      const insert = driver.buildInsertReturning(table, values, ['*']);
      const columns = Object.keys(values);
      const conflict = keys.map((key) => driver.quoteIdent(key)).join(', ');
      const updateColumns = columns.filter((column) => !keys.includes(column));
      const action =
        updateColumns.length === 0
          ? 'DO NOTHING'
          : `DO UPDATE SET ${updateColumns
              .map((column) => `${driver.quoteIdent(column)} = excluded.${driver.quoteIdent(column)}`)
              .join(', ')}`;

      return {
        sql: insert.sql.replace(/\sRETURNING\s\*$/i, ` ON CONFLICT (${conflict}) ${action} RETURNING *`),
        params: insert.params,
      };
    },

    async tableExists(table: string): Promise<boolean> {
      const rows = await driver.query<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name = @table UNION ALL SELECT name FROM sqlite_temp_master WHERE type IN ('table', 'view') AND name = @table",
        { table },
      );
      return rows.length > 0;
    },

    mapError,
  };

  function runQueryOn<Row>(
    currentDb: BetterSqliteDatabase,
    statement: string | SqlStatement,
    params?: SqlParams,
  ): Row[] {
    const normalized = normalizeStatement(statement, params);
    return bindAll(currentDb.prepare(normalized.sql), sqliteParams(normalized.params)) as Row[];
  }

  function runExecOn<Row>(
    currentDb: BetterSqliteDatabase,
    statement: string | SqlStatement,
    params?: SqlParams,
  ): SqlMutationResult<Row> {
    const normalized = normalizeStatement(statement, params);
    const sql = normalized.sql;

    if (isScript(sql, normalized.params)) {
      currentDb.exec(sql);
      return { rows: [], affectedRows: 0 };
    }

    const prepared = currentDb.prepare(sql);
    const boundParams = sqliteParams(normalized.params);

    if (hasReturning(sql)) {
      const rows = bindAll(prepared, boundParams) as Row[];
      return {
        rows,
        affectedRows: rows.length,
        insertId: resultInsertId(rows as Record<string, unknown>[], undefined),
      };
    }

    const result = bindRun(prepared, boundParams);
    return {
      rows: [],
      affectedRows: result.changes,
      insertId: result.lastInsertRowid,
    };
  }

  return driver;
}
