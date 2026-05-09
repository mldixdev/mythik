import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const TYPES_SOURCE = readFileSync(resolve(process.cwd(), 'packages/server/src/types.ts'), 'utf8');
const SERVER_SOURCE = readFileSync(resolve(process.cwd(), 'packages/server/src/server.ts'), 'utf8');
const CONNECTION_SOURCE = readFileSync(resolve(process.cwd(), 'packages/server/src/connection.ts'), 'utf8');

describe('server public type contract', () => {
  it('declares dialect-neutral API and connection types', () => {
    expect(TYPES_SOURCE).toContain("import type { SqlDialect, SqlDriver } from 'mythik/server'");
    expect(TYPES_SOURCE).toContain('dialect?: SqlDialect');
    expect(TYPES_SOURCE).toMatch(/type\??: 'sqlserver'/);
    expect(TYPES_SOURCE).toContain("type: 'postgres'");
    expect(TYPES_SOURCE).toContain("type: 'mysql'");
    expect(TYPES_SOURCE).toContain("type: 'sqlite'");
  });

  it('exposes SqlDriver on HandlerContext without SQL Server-specific helpers', () => {
    const handlerContext = TYPES_SOURCE.slice(
      TYPES_SOURCE.indexOf('export interface HandlerContext'),
      TYPES_SOURCE.indexOf('export interface UserContext'),
    );

    expect(handlerContext).toContain('db: SqlDriver');
    expect(handlerContext).not.toContain('sql:');
    expect(handlerContext).not.toContain('ConnectionPool');
    expect(TYPES_SOURCE).not.toContain("from 'mssql'");
  });

  it('assembles runtime through SqlDriver without a parallel SQL Server pool', () => {
    expect(SERVER_SOURCE).not.toContain("from 'mssql'");
    expect(SERVER_SOURCE).not.toContain('createConnectionPool');
    expect(SERVER_SOURCE).not.toContain('ConnectionPool');
    expect(SERVER_SOURCE).not.toContain('pool.request');
    expect(SERVER_SOURCE).toContain('createDatabaseDriver');
  });

  it('does not keep a legacy SQL Server pool factory in server connection helpers', () => {
    expect(CONNECTION_SOURCE).not.toContain("from 'mssql'");
    expect(CONNECTION_SOURCE).not.toContain('createConnectionPool');
    expect(CONNECTION_SOURCE).not.toContain('ConnectionPool');
  });
});
