export type SqlDialect = 'sqlserver' | 'postgres' | 'mysql' | 'sqlite';

export type SqlParams = Record<string, unknown> | readonly unknown[];

export interface SqlStatement {
  sql: string;
  params?: SqlParams;
}

export interface SqlCapabilities {
  dialect: SqlDialect;
  namedParams: boolean;
  positionalParams: boolean;
  nativeJson: boolean;
  nativeBoolean: boolean;
  returning: boolean;
  upsert: boolean;
  transactions: boolean;
}

export interface SqlMutationResult<Row = Record<string, unknown>> {
  rows: Row[];
  affectedRows: number;
  insertId?: unknown;
}

export interface SqlTransaction {
  query<Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams): Promise<Row[]>;
  exec<Row = Record<string, unknown>>(statement: string | SqlStatement, params?: SqlParams): Promise<SqlMutationResult<Row>>;
}

export interface SqlDriver extends SqlTransaction {
  readonly dialect: SqlDialect;
  readonly capabilities: SqlCapabilities;

  connect(): Promise<void>;
  close(): Promise<void>;
  transaction<T>(run: (tx: SqlTransaction) => Promise<T>): Promise<T>;

  quoteIdent(identifier: string): string;
  quoteQualified(...identifiers: string[]): string;
  compileNamedParams(statement: string, params: Record<string, unknown>): SqlStatement;
  paginate(statement: string, limit: number, offset: number): string;
  countQuery(statement: string): string;
  totalsQuery(statement: string): string;
  buildInsertReturning(table: string, values: Record<string, unknown>, returning?: string[]): SqlStatement;
  buildUpdateReturning(
    table: string,
    values: Record<string, unknown>,
    where: SqlStatement,
    returning?: string[],
  ): SqlStatement;
  buildDelete(table: string, where: SqlStatement): SqlStatement;
  buildUpsert(table: string, values: Record<string, unknown>, keys: string[]): SqlStatement;
  tableExists(table: string): Promise<boolean>;
  mapError(error: unknown): Error;
}

export interface SqlDriverConfig {
  dialect: SqlDialect;
  connection?: unknown;
}
