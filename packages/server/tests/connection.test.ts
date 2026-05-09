import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDatabaseDriver, resolveDatabaseDialect, toSqlDriverConfig } from '../src/connection.js';
import type { ConnectionConfig } from '../src/types.js';

describe('server database connection selection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults existing SQL Server configs to the SQL Server dialect', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const config: ConnectionConfig = { server: 'localhost', database: 'Mythik' };

    expect(resolveDatabaseDialect(config)).toBe('sqlserver');
    expect(warn).toHaveBeenCalledWith(
      'Mythik server database config omitted "type"; defaulting to "sqlserver" for backwards compatibility.',
    );
    expect(createDatabaseDriver(config).dialect).toBe('sqlserver');
    expect(toSqlDriverConfig(config)).toMatchObject({
      dialect: 'sqlserver',
      connection: {
        server: 'localhost',
        database: 'Mythik',
        port: 1433,
        options: { trustServerCertificate: true },
      },
    });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn when the SQL Server dialect is explicit', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveDatabaseDialect({ type: 'sqlserver', server: 'localhost', database: 'Mythik' })).toBe('sqlserver');

    expect(warn).not.toHaveBeenCalled();
  });

  it('creates SQLite, PostgreSQL, and MySQL drivers from explicit connection types', () => {
    expect(createDatabaseDriver({ type: 'sqlite', filename: ':memory:' }).dialect).toBe('sqlite');
    expect(createDatabaseDriver({ type: 'postgres', connectionString: 'postgres://localhost/mythik' }).dialect).toBe(
      'postgres',
    );
    expect(createDatabaseDriver({ type: 'mysql', uri: 'mysql://localhost/mythik' }).dialect).toBe('mysql');
  });

  it('fails loudly when ApiSpec dialect conflicts with database config type', () => {
    expect(() => createDatabaseDriver({ type: 'sqlite', filename: ':memory:' }, 'postgres')).toThrow(
      /dialect mismatch/i,
    );
  });
});
