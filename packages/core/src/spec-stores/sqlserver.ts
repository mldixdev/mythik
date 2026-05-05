import type { SpecStore } from '../spec-engine/types.js';
import { assertValidIdentifier } from '../security/identifier-guard.js';
import sql, { type config as SqlConfig, type ConnectionPool } from 'mssql';

export interface SqlServerSpecStoreConfig {
  server: string;
  database: string;
  user?: string;
  password?: string;
  port?: number;
  /** Use Windows Authentication (trusted connection). Default: false */
  trustedConnection?: boolean;
  /** Trust self-signed certificates. Default: true for local dev */
  trustServerCertificate?: boolean;
  /** Table name for spec storage. Default: 'screens' */
  table?: string;
}

export class SqlServerSpecStore implements SpecStore {
  private config: SqlConfig;
  private pool: ConnectionPool | null = null;
  private tableName: string;

  constructor(config: SqlServerSpecStoreConfig) {
    this.tableName = config.table ?? 'screens';
    assertValidIdentifier(this.tableName, 'SqlServerSpecStore.table');
    this.config = {
      server: config.server,
      database: config.database,
      user: config.user,
      password: config.password,
      port: config.port ?? 1433,
      options: {
        trustServerCertificate: config.trustServerCertificate ?? true,
        trustedConnection: config.trustedConnection ?? false,
      },
    };
  }

  private async getPool(): Promise<ConnectionPool> {
    if (!this.pool) {
      this.pool = await new sql.ConnectionPool(this.config).connect();
    }
    return this.pool;
  }

  async load(screenId: string): Promise<unknown> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, screenId)
      .query(`SELECT spec FROM [${this.tableName}] WHERE id = @id`);

    if (!result.recordset[0]) {
      throw new Error(`Spec "${screenId}" not found`);
    }

    const raw = result.recordset[0].spec;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  async save(screenId: string, spec: unknown): Promise<void> {
    const pool = await this.getPool();
    const specJson = JSON.stringify(spec);

    // MERGE for upsert: update if exists, insert if not
    await pool.request()
      .input('id', sql.NVarChar, screenId)
      .input('spec', sql.NVarChar(sql.MAX), specJson)
      .query(`
        MERGE [${this.tableName}] AS target
        USING (SELECT @id AS id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET spec = @spec, updated_at = GETUTCDATE(), version = version + 1
        WHEN NOT MATCHED THEN
          INSERT (id, name, spec, version, is_active) VALUES (@id, @id, @spec, 1, 1);
      `);
  }

  async list(): Promise<string[]> {
    const pool = await this.getPool();
    const result = await pool.request()
      .query(`SELECT id FROM [${this.tableName}] ORDER BY id`);

    return result.recordset.map((r) => r.id as string);
  }

  async delete(screenId: string): Promise<void> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, screenId)
      .query(`DELETE FROM [${this.tableName}] WHERE id = @id`);

    if (result.rowsAffected[0] === 0) {
      throw new Error(`Spec "${screenId}" not found`);
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}
