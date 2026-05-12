import { compileNamedParams as compileSqlNamedParams } from '../named-params.js';
import { missingSqlDriverDependencyError, SqlDriverError } from '../errors.js';
import type { SqlDriver, SqlDriverConfig, SqlMutationResult, SqlParams, SqlStatement, SqlTransaction } from '../types.js';

interface MssqlRequest {
  input(name: string, type: unknown, value: unknown): MssqlRequest;
  query(sql: string): Promise<{ recordset?: Record<string, unknown>[]; rowsAffected?: number[] }>;
}

interface MssqlConnection {
  request(): MssqlRequest;
  close(): Promise<void>;
}

interface MssqlTransaction {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  request(): MssqlRequest;
}

interface MssqlConnectionPoolConstructor {
  new (config: unknown): { connect(): Promise<MssqlConnection> };
}

interface MssqlTransactionConstructor {
  new (connection: MssqlConnection): MssqlTransaction;
}

interface MssqlModuleShape {
  ConnectionPool: MssqlConnectionPoolConstructor;
  Transaction?: MssqlTransactionConstructor;
  NVarChar: ((length: unknown) => unknown) & unknown;
  MAX: unknown;
  Int?: unknown;
  BigInt?: unknown;
  Bit?: unknown;
  Float?: unknown;
  DateTime2?: unknown;
}

type MssqlModuleImport = MssqlModuleShape & { default?: MssqlModuleShape };

export interface SqlServerDriverDeps {
  loadMssql?: () => Promise<MssqlModuleImport>;
}

const SQLSERVER_CAPABILITIES = {
  dialect: 'sqlserver',
  namedParams: true,
  positionalParams: false,
  nativeJson: false,
  nativeBoolean: false,
  returning: true,
  upsert: true,
  transactions: true,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (/^(true|1|yes)$/i.test(value)) return true;
  if (/^(false|0|no)$/i.test(value)) return false;
  return undefined;
}

function connectionConfig(connection: unknown): unknown {
  if (typeof connection !== 'string') {
    return isRecord(connection) ? connection : {};
  }

  try {
    const url = new URL(connection);
    const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const port = url.port ? Number(url.port) : undefined;
    const encrypt = parseBoolean(url.searchParams.get('encrypt'));
    const trustServerCertificate = parseBoolean(url.searchParams.get('trustServerCertificate'));
    const options: Record<string, unknown> = {};
    if (encrypt !== undefined) options.encrypt = encrypt;
    if (trustServerCertificate !== undefined) options.trustServerCertificate = trustServerCertificate;

    return {
      server: decodeURIComponent(url.hostname),
      ...(port !== undefined && Number.isFinite(port) ? { port } : {}),
      ...(database ? { database } : {}),
      ...(url.username ? { user: decodeURIComponent(url.username) } : {}),
      ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
      ...(Object.keys(options).length > 0 ? { options } : {}),
    };
  } catch {
    return connection;
  }
}

function trimStatement(statement: string): string {
  return statement.trim().replace(/;\s*$/, '');
}

function hasOrderBy(statement: string): boolean {
  return /\border\s+by\b/i.test(statement);
}

function stripTrailingOrderBy(statement: string): string {
  return trimStatement(statement).replace(/\s+order\s+by\s+[\s\S]+$/i, '').trim();
}

function whereClause(where: SqlStatement): string {
  const sql = trimStatement(where.sql);
  return /^where\b/i.test(sql) ? sql : `WHERE ${sql}`;
}

function requireIdentifier(identifier: string): string {
  if (identifier.trim() === '') {
    throw new SqlDriverError('SQL identifier cannot be empty.', {
      code: 'SQL_IDENTIFIER_INVALID',
      dialect: 'sqlserver',
    });
  }
  return identifier;
}

function normalizeModule(mod: MssqlModuleImport): MssqlModuleShape {
  return mod.default ?? mod;
}

async function loadMssqlModule(): Promise<MssqlModuleImport> {
  try {
    return (await import('mssql')) as unknown as MssqlModuleImport;
  } catch (error) {
    throw missingSqlDriverDependencyError({
      label: 'SQL Server',
      dialect: 'sqlserver',
      packageName: 'mssql',
      cause: error,
    });
  }
}

function normalizeStatement(statement: string | SqlStatement, params?: SqlParams): SqlStatement {
  const source = typeof statement === 'string' ? { sql: statement, params } : statement;
  if (source.params === undefined) return source;
  if (!isRecord(source.params)) {
    throw new SqlDriverError('SQL Server driver requires named object params.', {
      code: 'SQL_PARAMS_INVALID',
      dialect: 'sqlserver',
    });
  }
  return compileSqlNamedParams('sqlserver', source.sql, source.params);
}

function normalizeValue(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value;
  if (value === null) return null;
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function sqlTypeFor(value: unknown, mssql: MssqlModuleShape): unknown {
  if (typeof value === 'boolean') return mssql.Bit ?? mssql.NVarChar(mssql.MAX);
  if (typeof value === 'bigint') return mssql.BigInt ?? mssql.NVarChar(mssql.MAX);
  if (typeof value === 'number') return Number.isInteger(value) ? (mssql.Int ?? mssql.NVarChar(mssql.MAX)) : (mssql.Float ?? mssql.NVarChar(mssql.MAX));
  if (value instanceof Date) return mssql.DateTime2 ?? mssql.NVarChar(mssql.MAX);
  return mssql.NVarChar(mssql.MAX);
}

function bindParams(request: MssqlRequest, mssql: MssqlModuleShape, params: SqlParams | undefined): MssqlRequest {
  if (params === undefined) return request;
  if (Array.isArray(params)) {
    throw new SqlDriverError('SQL Server driver requires named object params.', {
      code: 'SQL_PARAMS_INVALID',
      dialect: 'sqlserver',
    });
  }

  for (const [name, value] of Object.entries(params)) {
    request.input(name, sqlTypeFor(value, mssql), normalizeValue(value));
  }
  return request;
}

function requireObjectParams(statement: SqlStatement, purpose: string): Record<string, unknown> {
  if (statement.params === undefined) return {};
  if (!isRecord(statement.params)) {
    throw new SqlDriverError(`${purpose} requires named object params.`, {
      code: 'SQL_PARAMS_INVALID',
      dialect: 'sqlserver',
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

function affectedRows(rowsAffected: number[] | undefined): number {
  return rowsAffected?.reduce((sum, current) => sum + current, 0) ?? 0;
}

function insertIdFromRows(rows: Record<string, unknown>[]): unknown {
  const first = rows[0];
  if (first && Object.prototype.hasOwnProperty.call(first, 'id')) return first.id;
  return undefined;
}

export function createSqlServerDriver(config: SqlDriverConfig, deps: SqlServerDriverDeps = {}): SqlDriver {
  let mssqlModule: MssqlModuleShape | undefined;
  let connection: MssqlConnection | undefined;
  const loadMssql = deps.loadMssql ?? loadMssqlModule;

  function mapError(error: unknown, code = 'SQL_DRIVER_QUERY_FAILED'): Error {
    if (error instanceof SqlDriverError) return error;
    return new SqlDriverError(error instanceof Error ? error.message : 'SQL Server driver error.', {
      code,
      dialect: 'sqlserver',
      cause: error,
    });
  }

  async function mssql(): Promise<MssqlModuleShape> {
    if (mssqlModule) return mssqlModule;
    try {
      mssqlModule = normalizeModule(await loadMssql());
      return mssqlModule;
    } catch (error) {
      if (error instanceof SqlDriverError) throw error;
      throw missingSqlDriverDependencyError({
        label: 'SQL Server',
        dialect: 'sqlserver',
        packageName: 'mssql',
        cause: error,
      });
    }
  }

  async function pool(): Promise<MssqlConnection> {
    if (connection) return connection;
    const sql = await mssql();
    connection = await new sql.ConnectionPool(connectionConfig(config.connection)).connect();
    return connection;
  }

  async function runQuery<Row>(
    source: { request(): MssqlRequest } | undefined,
    statement: string | SqlStatement,
    params?: SqlParams,
  ): Promise<Row[]> {
    const sql = await mssql();
    const normalized = normalizeStatement(statement, params);
    const requestSource = source ?? (await pool());
    const request = bindParams(requestSource.request(), sql, normalized.params);
    const result = await request.query(normalized.sql);
    return (result.recordset ?? []) as Row[];
  }

  async function runExec<Row>(
    source: { request(): MssqlRequest } | undefined,
    statement: string | SqlStatement,
    params?: SqlParams,
  ): Promise<SqlMutationResult<Row>> {
    const sql = await mssql();
    const normalized = normalizeStatement(statement, params);
    const requestSource = source ?? (await pool());
    const request = bindParams(requestSource.request(), sql, normalized.params);
    const result = await request.query(normalized.sql);
    const rows = (result.recordset ?? []) as Row[];
    return {
      rows,
      affectedRows: affectedRows(result.rowsAffected),
      insertId: insertIdFromRows(rows as Record<string, unknown>[]),
    };
  }

  const driver: SqlDriver = {
    dialect: 'sqlserver',
    capabilities: SQLSERVER_CAPABILITIES,

    async connect(): Promise<void> {
      await pool();
    },

    async close(): Promise<void> {
      await connection?.close();
      connection = undefined;
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
      const sql = await mssql();
      const currentPool = await pool();
      if (!sql.Transaction) {
        throw new SqlDriverError('SQL Server transaction support requires the mssql Transaction API.', {
          code: 'SQL_TRANSACTION_UNAVAILABLE',
          dialect: 'sqlserver',
        });
      }

      const tx = new sql.Transaction(currentPool);
      await tx.begin();
      try {
        const result = await run({
          query: <Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams) =>
            runQuery<Row>(tx, statement, params),
          exec: <Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams) =>
            runExec<Row>(tx, statement, params),
        });
        await tx.commit();
        return result;
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    },

    quoteIdent(identifier: string): string {
      return `[${requireIdentifier(identifier).replace(/]/g, ']]')}]`;
    },

    quoteQualified(...identifiers: string[]): string {
      return identifiers.map((identifier) => driver.quoteIdent(identifier)).join('.');
    },

    compileNamedParams(statement: string, params: Record<string, unknown>): SqlStatement {
      return compileSqlNamedParams('sqlserver', statement, params);
    },

    paginate(statement: string, limit: number, offset: number): string {
      const cleanLimit = Math.trunc(limit);
      const cleanOffset = Math.trunc(offset);
      if (!Number.isFinite(cleanLimit) || cleanLimit < 0 || !Number.isFinite(cleanOffset) || cleanOffset < 0) {
        throw new SqlDriverError('SQL Server pagination limit and offset must be finite non-negative numbers.', {
          code: 'SQL_PAGINATION_INVALID',
          dialect: 'sqlserver',
        });
      }
      const base = trimStatement(statement);
      const ordered = hasOrderBy(base) ? base : `${base} ORDER BY (SELECT 0)`;
      return `${ordered} OFFSET ${cleanOffset} ROWS FETCH NEXT ${cleanLimit} ROWS ONLY`;
    },

    countQuery(statement: string): string {
      return `SELECT COUNT(*) AS total FROM (${stripTrailingOrderBy(statement)}) AS [mythik_count]`;
    },

    totalsQuery(statement: string): string {
      return `SELECT * FROM (${stripTrailingOrderBy(statement)}) AS [mythik_totals]`;
    },

    buildInsertReturning(table: string, values: Record<string, unknown>, returning = ['*']): SqlStatement {
      const columns = Object.keys(values);
      if (columns.length === 0) {
        throw new SqlDriverError('SQL Server insert requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'sqlserver',
        });
      }

      const used = new Set<string>();
      const params: Record<string, unknown> = {};
      const placeholders = columns.map((column) => {
        const name = uniqueParamName(column, used);
        params[name] = values[column];
        return `@${name}`;
      });
      const projection = returning.includes('*')
        ? 'INSERTED.*'
        : returning.map((column) => `INSERTED.${driver.quoteIdent(column)}`).join(', ');

      return {
        sql: `INSERT INTO ${driver.quoteIdent(table)} (${columns.map((column) => driver.quoteIdent(column)).join(', ')}) OUTPUT ${projection} VALUES (${placeholders.join(', ')})`,
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
        throw new SqlDriverError('SQL Server update requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'sqlserver',
        });
      }

      const params = { ...requireObjectParams(where, 'SQL Server update') };
      const used = new Set(Object.keys(params));
      const assignments = columns.map((column) => {
        const name = uniqueParamName(`set_${column}`, used);
        params[name] = values[column];
        return `${driver.quoteIdent(column)} = @${name}`;
      });
      const projection = returning.includes('*')
        ? 'INSERTED.*'
        : returning.map((column) => `INSERTED.${driver.quoteIdent(column)}`).join(', ');

      return {
        sql: `UPDATE ${driver.quoteIdent(table)} SET ${assignments.join(', ')} OUTPUT ${projection} ${whereClause(where)}`,
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
        throw new SqlDriverError('SQL Server upsert requires at least one value.', {
          code: 'SQL_VALUES_EMPTY',
          dialect: 'sqlserver',
        });
      }
      if (keys.length === 0) {
        throw new SqlDriverError('SQL Server upsert requires at least one conflict key.', {
          code: 'SQL_KEYS_EMPTY',
          dialect: 'sqlserver',
        });
      }

      const used = new Set<string>();
      const params: Record<string, unknown> = {};
      const sourceColumns = columns.map((column) => {
        const name = uniqueParamName(column, used);
        params[name] = values[column];
        return `@${name} AS ${driver.quoteIdent(column)}`;
      });
      const onClause = keys
        .map((key) => `target.${driver.quoteIdent(key)} = source.${driver.quoteIdent(key)}`)
        .join(' AND ');
      const updateColumns = columns.filter((column) => !keys.includes(column));
      const updateClause =
        updateColumns.length === 0
          ? ''
          : `WHEN MATCHED THEN UPDATE SET ${updateColumns
              .map((column) => `target.${driver.quoteIdent(column)} = source.${driver.quoteIdent(column)}`)
              .join(', ')}`;

      return {
        sql: `MERGE ${driver.quoteIdent(table)} AS target USING (SELECT ${sourceColumns.join(', ')}) AS source ON ${onClause} ${updateClause} WHEN NOT MATCHED THEN INSERT (${columns.map((column) => driver.quoteIdent(column)).join(', ')}) VALUES (${columns.map((column) => `source.${driver.quoteIdent(column)}`).join(', ')}) OUTPUT INSERTED.*;`,
        params,
      };
    },

    async tableExists(table: string): Promise<boolean> {
      const [schema, name] = table.includes('.') ? table.split('.', 2) : ['dbo', table];
      const rows = await driver.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @name`,
        { schema, name },
      );
      return rows.length > 0;
    },

    mapError,
  };

  return driver;
}
