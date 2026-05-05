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

  export const NVarChar: {
    (length: unknown): unknown;
  } & unknown;

  export const MAX: unknown;

  const sql: {
    ConnectionPool: typeof ConnectionPool;
    NVarChar: typeof NVarChar;
    MAX: typeof MAX;
    config: config;
  };
  export default sql;
}
