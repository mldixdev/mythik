import { compileNamedParams as compileSqlNamedParams } from '../named-params.js';
import { missingSqlDriverDependencyError, SqlDriverError } from '../errors.js';
import type { SqlDriver, SqlDriverConfig, SqlMutationResult, SqlParams, SqlStatement, SqlTransaction } from '../types.js';

interface PgQueryResult {
  rows: Record<string, unknown>[];
  rowCount?: number | null;
}

interface PgQueryable {
  query(statement: string, values?: readonly unknown[]): Promise<PgQueryResult>;
}

interface PgClient extends PgQueryable {
  release(): void;
}

interface PgPool extends PgQueryable {
  connect(): Promise<PgClient>;
  end(): Promise<void>;
}

interface PgPoolConstructor {
  new (config?: unknown): PgPool;
}

interface PgModuleShape {
  Pool: PgPoolConstructor;
}

type PgModuleImport = PgModuleShape & { default?: PgModuleShape };

export interface PostgresDriverDeps {
  loadPg?: () => Promise<PgModuleImport>;
}

const POSTGRES_CAPABILITIES = {
  dialect: 'postgres',
  namedParams: true,
  positionalParams: true,
  nativeJson: true,
  nativeBoolean: true,
  returning: true,
  upsert: true,
  transactions: true,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function connectionConfig(connection: unknown): unknown {
  if (typeof connection === 'string') {
    return { connectionString: connection };
  }
  return isRecord(connection) ? connection : {};
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
    throw new SqlDriverError('PostgreSQL identifier cannot be empty.', {
      code: 'SQL_IDENTIFIER_INVALID',
      dialect: 'postgres',
    });
  }
  return identifier;
}

function normalizeModule(mod: PgModuleImport): PgModuleShape {
  return mod.default ?? mod;
}

async function loadPgModule(): Promise<PgModuleImport> {
  try {
    return (await import('pg')) as unknown as PgModuleImport;
  } catch (error) {
    throw missingSqlDriverDependencyError({
      label: 'PostgreSQL',
      dialect: 'postgres',
      packageName: 'pg',
      cause: error,
    });
  }
}

function postgresValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function postgresParams(params: SqlParams | undefined): readonly unknown[] | undefined {
  if (params === undefined) return undefined;
  if (Array.isArray(params)) return params.map(postgresValue);
  throw new SqlDriverError('PostgreSQL driver requires positional params after compilation.', {
    code: 'SQL_PARAMS_INVALID',
    dialect: 'postgres',
  });
}

function normalizeStatement(statement: string | SqlStatement, params?: SqlParams): SqlStatement {
  const source = typeof statement === 'string' ? { sql: statement, params } : statement;
  if (isRecord(source.params)) {
    return compileSqlNamedParams('postgres', source.sql, source.params);
  }
  return source;
}

function requireObjectParams(statement: SqlStatement, purpose: string): Record<string, unknown> {
  if (statement.params === undefined) return {};
  if (!isRecord(statement.params)) {
    throw new SqlDriverError(`${purpose} requires named object params.`, {
      code: 'SQL_PARAMS_INVALID',
      dialect: 'postgres',
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

function insertIdFromRows(rows: Record<string, unknown>[]): unknown {
  const first = rows[0];
  if (first && Object.prototype.hasOwnProperty.call(first, 'id')) return first.id;
  return undefined;
}

export function createPostgresDriver(config: SqlDriverConfig, deps: PostgresDriverDeps = {}): SqlDriver {
  let pgModule: PgModuleShape | undefined;
  let poolInstance: PgPool | undefined;
  const loadPg = deps.loadPg ?? loadPgModule;

  function mapError(error: unknown, code = 'SQL_DRIVER_QUERY_FAILED'): Error {
    if (error instanceof SqlDriverError) return error;
    return new SqlDriverError(error instanceof Error ? error.message : 'PostgreSQL driver error.', {
      code,
      dialect: 'postgres',
      cause: error,
    });
  }

  async function pg(): Promise<PgModuleShape> {
    if (pgModule) return pgModule;
    try {
      pgModule = normalizeModule(await loadPg());
      return pgModule;
    } catch (error) {
      if (error instanceof SqlDriverError) throw error;
      throw missingSqlDriverDependencyError({
        label: 'PostgreSQL',
        dialect: 'postgres',
        packageName: 'pg',
        cause: error,
      });
    }
  }

  async function pool(): Promise<PgPool> {
    if (poolInstance) return poolInstance;
    const mod = await pg();
    poolInstance = new mod.Pool(connectionConfig(config.connection));
    return poolInstance;
  }

  async function runQuery<Row>(target: PgQueryable | undefined, statement: string | SqlStatement, params?: SqlParams): Promise<Row[]> {
    const normalized = normalizeStatement(statement, params);
    const source = target ?? (await pool());
    const result = await source.query(normalized.sql, postgresParams(normalized.params));
    return result.rows as Row[];
  }

  async function runExec<Row>(
    target: PgQueryable | undefined,
    statement: string | SqlStatement,
    params?: SqlParams,
  ): Promise<SqlMutationResult<Row>> {
    const normalized = normalizeStatement(statement, params);
    const source = target ?? (await pool());
    const result = await source.query(normalized.sql, postgresParams(normalized.params));
    const rows = result.rows as Row[];
    return {
      rows,
      affectedRows: result.rowCount ?? rows.length,
      insertId: insertIdFromRows(result.rows),
    };
  }

  const driver: SqlDriver = {
    dialect: 'postgres',
    capabilities: POSTGRES_CAPABILITIES,

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
      const client = await (await pool()).connect();
      await client.query('BEGIN');
      try {
        const result = await run({
          query: <Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams) =>
            runQuery<Row>(client, statement, params),
          exec: <Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams) =>
            runExec<Row>(client, statement, params),
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    quoteIdent(identifier: string): string {
      return `"${requireIdentifier(identifier).replace(/"/g, '""')}"`;
    },

    quoteQualified(...identifiers: string[]): string {
      return identifiers.map((identifier) => driver.quoteIdent(identifier)).join('.');
    },

    compileNamedParams(statement: string, params: Record<string, unknown>): SqlStatement {
      return compileSqlNamedParams('postgres', statement, params);
    },

    paginate(statement: string, limit: number, offset: number): string {
      const cleanLimit = Math.trunc(limit);
      const cleanOffset = Math.trunc(offset);
      if (!Number.isFinite(cleanLimit) || cleanLimit < 0 || !Number.isFinite(cleanOffset) || cleanOffset < 0) {
        throw new SqlDriverError('PostgreSQL pagination limit and offset must be finite non-negative numbers.', {
          code: 'SQL_PAGINATION_INVALID',
          dialect: 'postgres',
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
        throw new SqlDriverError('PostgreSQL insert requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'postgres',
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
        throw new SqlDriverError('PostgreSQL update requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'postgres',
        });
      }

      const params = { ...requireObjectParams(where, 'PostgreSQL update') };
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
        throw new SqlDriverError('PostgreSQL upsert requires at least one conflict key.', {
          code: 'SQL_KEYS_EMPTY',
          dialect: 'postgres',
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
              .map((column) => `${driver.quoteIdent(column)} = EXCLUDED.${driver.quoteIdent(column)}`)
              .join(', ')}`;

      return {
        sql: insert.sql.replace(/\sRETURNING\s\*$/i, ` ON CONFLICT (${conflict}) ${action} RETURNING *`),
        params: insert.params,
      };
    },

    async tableExists(table: string): Promise<boolean> {
      const [schema, name] = table.includes('.') ? table.split('.', 2) : ['public', table];
      const rows = await driver.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = @schema AND table_name = @name',
        { schema, name },
      );
      return rows.length > 0;
    },

    mapError,
  };

  return driver;
}
