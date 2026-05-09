// External database drivers without TypeScript declarations.
// Add new entries here as storage adapters are implemented.

declare module 'mssql' {
  export interface config {
    server: string;
    database: string;
    user?: string;
    password?: string;
    port?: number;
    options?: Record<string, unknown>;
  }

  export class ConnectionPool {
    constructor(config: config);
    connect(): Promise<ConnectionPool>;
    request(): Request;
    close(): Promise<void>;
  }

  export class Request {
    input(name: string, type: unknown, value: unknown): Request;
    query(sql: string): Promise<{ recordset: Record<string, unknown>[]; rowsAffected: number[] }>;
  }

  export class Transaction {
    constructor(pool: ConnectionPool);
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    request(): Request;
  }

  export const NVarChar: {
    (length: unknown): unknown;
  } & unknown;

  export const MAX: unknown;
  export const Int: unknown;
  export const BigInt: unknown;
  export const Bit: unknown;
  export const Float: unknown;
  export const DateTime2: unknown;

  const sql: {
    ConnectionPool: typeof ConnectionPool;
    Transaction: typeof Transaction;
    NVarChar: typeof NVarChar;
    MAX: typeof MAX;
    Int: typeof Int;
    BigInt: typeof BigInt;
    Bit: typeof Bit;
    Float: typeof Float;
    DateTime2: typeof DateTime2;
    config: config;
  };
  export default sql;
}

declare module 'better-sqlite3' {
  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface Statement {
    all(...params: unknown[]): Record<string, unknown>[];
    all(params: Record<string, unknown>): Record<string, unknown>[];
    get(...params: unknown[]): Record<string, unknown> | undefined;
    get(params: Record<string, unknown>): Record<string, unknown> | undefined;
    run(...params: unknown[]): RunResult;
    run(params: Record<string, unknown>): RunResult;
  }

  export default class Database {
    constructor(filename?: string, options?: Record<string, unknown>);
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
  }
}

declare module 'pg' {
  export interface QueryResult<Row = Record<string, unknown>> {
    rows: Row[];
    rowCount: number | null;
  }

  export interface PoolClient {
    query<Row = Record<string, unknown>>(statement: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: unknown);
    query<Row = Record<string, unknown>>(statement: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }

  const pg: {
    Pool: typeof Pool;
  };
  export default pg;
}

declare module 'mysql2/promise' {
  export interface PoolConnection {
    execute(statement: string, values?: readonly unknown[]): Promise<[unknown, unknown[]]>;
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): void;
  }

  export interface Pool {
    execute(statement: string, values?: readonly unknown[]): Promise<[unknown, unknown[]]>;
    getConnection(): Promise<PoolConnection>;
    end(): Promise<void>;
  }

  export function createPool(config?: unknown): Pool;

  const mysql: {
    createPool: typeof createPool;
  };
  export default mysql;
}
