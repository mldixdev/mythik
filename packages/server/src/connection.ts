import sql, { type ConnectionPool } from 'mssql';
import type { ConnectionConfig } from './types.js';
import { resolveEnvVars } from './spec-loader.js';

export async function createConnectionPool(config: ConnectionConfig): Promise<ConnectionPool> {
  const resolved = resolveEnvVars(config as unknown as Record<string, unknown>);

  const pool = new sql.ConnectionPool({
    server: resolved.server as string,
    database: resolved.database as string,
    user: resolved.user as string | undefined,
    password: resolved.password as string | undefined,
    port: (resolved.port as number) ?? 1433,
    options: {
      trustServerCertificate: (resolved.trustServerCertificate as boolean) ?? true,
    },
  });

  await pool.connect();
  return pool;
}
