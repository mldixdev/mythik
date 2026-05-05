// External database drivers without TypeScript declarations.
// The mssql package uses a default export with all types as properties.
// Named imports work in TypeScript but fail at runtime with ESM.
// Use: import sql from 'mssql' → sql.ConnectionPool, sql.Int, etc.

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
    connected: boolean;
  }

  export class Request {
    input(name: string, type: ISqlTypeFactoryWithNoParams, value: unknown): Request;
    input(name: string, value: unknown): Request;
    query(sql: string): Promise<IResult<Record<string, unknown>>>;
  }

  export interface IResult<T> {
    recordset: T[];
    recordsets: T[][];
    rowsAffected: number[];
    output: Record<string, unknown>;
  }

  export interface ISqlTypeFactoryWithNoParams {
    (): unknown;
  }

  export const Int: ISqlTypeFactoryWithNoParams;
  export const Float: ISqlTypeFactoryWithNoParams;
  export const Bit: ISqlTypeFactoryWithNoParams;
  export const NVarChar: ISqlTypeFactoryWithNoParams & ((length?: number) => ISqlTypeFactoryWithNoParams);
  export const DateTime: ISqlTypeFactoryWithNoParams;
  export const MAX: number;

  // Default export — this is how the module is actually consumed at runtime
  const sql: {
    ConnectionPool: typeof ConnectionPool;
    Request: typeof Request;
    Int: typeof Int;
    Float: typeof Float;
    Bit: typeof Bit;
    NVarChar: typeof NVarChar;
    DateTime: typeof DateTime;
    MAX: typeof MAX;
    config: config;
  };
  export default sql;
}
