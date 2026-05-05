import { SqlServerSpecStore, type SqlServerSpecStoreConfig } from './sqlserver.js';
import type { VersionedSpecStore, EnvironmentStore, VersionMeta, VersionEntry, EnvironmentPointer } from '../versioning/types.js';
import { computePatches } from '../versioning/compute-patches.js';
import { applyPatches } from '../streaming/patch.js';
import type { JsonPatch } from '../streaming/patch.js';
import { assertValidIdentifier } from '../security/identifier-guard.js';
import sql, { type config as SqlConfig, type ConnectionPool } from 'mssql';

export interface SqlServerVersionedSpecStoreConfig extends SqlServerSpecStoreConfig {
  /** Table for version history. Default: 'screen_versions' */
  versionsTable?: string;
  /** Snapshot interval (full spec stored every N versions). Default: 10 */
  snapshotInterval?: number;
}

export class SqlServerVersionedSpecStore extends SqlServerSpecStore implements VersionedSpecStore {
  private versionsTable: string;
  private snapshotInterval: number;
  private vPool: ConnectionPool | null = null;
  private vConfig: SqlConfig;

  constructor(config: SqlServerVersionedSpecStoreConfig) {
    super(config);
    this.versionsTable = config.versionsTable ?? 'screen_versions';
    assertValidIdentifier(this.versionsTable, 'SqlServerVersionedSpecStore.versionsTable');
    this.snapshotInterval = config.snapshotInterval ?? 10;
    this.vConfig = {
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

  private async getVersionPool(): Promise<ConnectionPool> {
    if (!this.vPool) {
      this.vPool = await new sql.ConnectionPool(this.vConfig).connect();
    }
    return this.vPool;
  }

  async saveVersion(id: string, doc: unknown, meta: VersionMeta): Promise<number> {
    const pool = await this.getVersionPool();

    // Get current max version
    const maxResult = await pool.request()
      .input('screen_id', sql.NVarChar, id)
      .query(`SELECT ISNULL(MAX(version), 0) AS maxVersion FROM [${this.versionsTable}] WHERE screen_id = @screen_id`);
    let currentMax = maxResult.recordset[0].maxVersion as number;

    // Lazy bootstrap: if no history, create v1 from current spec
    if (currentMax === 0) {
      let existingSpec: unknown | null = null;
      try {
        existingSpec = await this.load(id);
      } catch {
        // No existing spec
      }

      if (existingSpec !== null && existingSpec !== undefined) {
        currentMax = 1;
        await pool.request()
          .input('screen_id', sql.NVarChar, id)
          .input('spec', sql.NVarChar(sql.MAX), JSON.stringify(existingSpec))
          .input('author', sql.NVarChar, 'system')
          .input('source_type', sql.NVarChar, 'push')
          .input('description', sql.NVarChar, 'Bootstrapped from existing spec')
          .query(`
            INSERT INTO [${this.versionsTable}] (screen_id, version, is_snapshot, spec, author, source_type, description)
            VALUES (@screen_id, 1, 1, @spec, @author, @source_type, @description)
          `);
      }
    }

    const newVersion = currentMax + 1;
    const isSnapshot = newVersion === 1 || newVersion % this.snapshotInterval === 0;

    if (isSnapshot) {
      await pool.request()
        .input('screen_id', sql.NVarChar, id)
        .input('spec', sql.NVarChar(sql.MAX), JSON.stringify(doc))
        .input('author', sql.NVarChar, meta.author)
        .input('source_type', sql.NVarChar, meta.source)
        .input('description', sql.NVarChar, meta.description ?? null)
        .query(`
          INSERT INTO [${this.versionsTable}] (screen_id, version, is_snapshot, spec, author, source_type, description)
          VALUES (@screen_id, ${newVersion}, 1, @spec, @author, @source_type, @description)
        `);
    } else {
      const prevSpec = await this.loadVersion(id, currentMax);
      const patches = computePatches(prevSpec as Record<string, unknown>, doc as Record<string, unknown>);

      await pool.request()
        .input('screen_id', sql.NVarChar, id)
        .input('patches', sql.NVarChar(sql.MAX), JSON.stringify(patches))
        .input('author', sql.NVarChar, meta.author)
        .input('source_type', sql.NVarChar, meta.source)
        .input('description', sql.NVarChar, meta.description ?? null)
        .query(`
          INSERT INTO [${this.versionsTable}] (screen_id, version, is_snapshot, patches, author, source_type, description)
          VALUES (@screen_id, ${newVersion}, 0, @patches, @author, @source_type, @description)
        `);
    }

    // Update current spec in base table
    await this.save(id, doc);

    return newVersion;
  }

  async loadVersion(id: string, version: number): Promise<unknown> {
    const pool = await this.getVersionPool();

    // Find nearest snapshot at or before target version
    const snapshotResult = await pool.request()
      .input('screen_id', sql.NVarChar, id)
      .query(`
        SELECT TOP 1 version, spec FROM [${this.versionsTable}]
        WHERE screen_id = @screen_id AND version <= ${version} AND is_snapshot = 1
        ORDER BY version DESC
      `);

    if (!snapshotResult.recordset[0]) {
      throw new Error(`No snapshot found for "${id}" at or before v${version}`);
    }

    const snapshotVersion = snapshotResult.recordset[0].version as number;
    const snapshotSpec = typeof snapshotResult.recordset[0].spec === 'string'
      ? JSON.parse(snapshotResult.recordset[0].spec)
      : snapshotResult.recordset[0].spec;

    if (snapshotVersion === version) {
      return snapshotSpec;
    }

    // Apply patches from snapshot+1 to target version
    const patchResult = await pool.request()
      .input('screen_id', sql.NVarChar, id)
      .query(`
        SELECT version, patches FROM [${this.versionsTable}]
        WHERE screen_id = @screen_id AND version >= ${snapshotVersion + 1} AND version <= ${version} AND is_snapshot = 0
        ORDER BY version ASC
      `);

    let result = structuredClone(snapshotSpec) as Record<string, unknown>;
    for (const row of patchResult.recordset) {
      if (row.patches) {
        const patches: JsonPatch[] = typeof row.patches === 'string' ? JSON.parse(row.patches) : row.patches;
        result = applyPatches(result, patches);
      }
    }

    return result;
  }

  async listVersions(id: string, limit?: number): Promise<VersionEntry[]> {
    const pool = await this.getVersionPool();
    const limitClause = limit ? `TOP ${limit}` : '';

    const result = await pool.request()
      .input('screen_id', sql.NVarChar, id)
      .query(`
        SELECT ${limitClause} version, created_at, author, source_type, description, is_snapshot
        FROM [${this.versionsTable}]
        WHERE screen_id = @screen_id
        ORDER BY version DESC
      `);

    return result.recordset.map((r: Record<string, unknown>) => ({
      version: r.version as number,
      timestamp: (r.created_at as Date).toISOString(),
      author: r.author as string,
      source: r.source_type as string,
      description: r.description as string | undefined,
      isSnapshot: !!(r.is_snapshot),
    }));
  }

  async currentVersion(id: string): Promise<number> {
    const pool = await this.getVersionPool();
    const result = await pool.request()
      .input('screen_id', sql.NVarChar, id)
      .query(`SELECT ISNULL(MAX(version), 0) AS maxVersion FROM [${this.versionsTable}] WHERE screen_id = @screen_id`);
    return result.recordset[0].maxVersion as number;
  }

  async closeVersioned(): Promise<void> {
    if (this.vPool) {
      await this.vPool.close();
      this.vPool = null;
    }
    await this.close();
  }
}

export interface SqlServerEnvironmentStoreConfig {
  server: string;
  database: string;
  user?: string;
  password?: string;
  port?: number;
  trustedConnection?: boolean;
  trustServerCertificate?: boolean;
  /** Table name. Default: 'screen_environments' */
  table?: string;
}

export class SqlServerEnvironmentStore implements EnvironmentStore {
  private pool: ConnectionPool | null = null;
  private sqlConfig: SqlConfig;
  private tableName: string;

  constructor(config: SqlServerEnvironmentStoreConfig) {
    this.tableName = config.table ?? 'screen_environments';
    assertValidIdentifier(this.tableName, 'SqlServerEnvironmentStore.table');
    this.sqlConfig = {
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
      this.pool = await new sql.ConnectionPool(this.sqlConfig).connect();
    }
    return this.pool;
  }

  async getEnvironments(specId: string): Promise<EnvironmentPointer[]> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('screen_id', sql.NVarChar, specId)
      .query(`
        SELECT environment, version, promoted_at, promoted_by
        FROM [${this.tableName}]
        WHERE screen_id = @screen_id
        ORDER BY environment
      `);

    return result.recordset.map((r: Record<string, unknown>) => ({
      name: r.environment as string,
      version: r.version as number,
      promotedAt: (r.promoted_at as Date).toISOString(),
      promotedBy: r.promoted_by as string,
    }));
  }

  async getEnvironment(specId: string, env: string): Promise<EnvironmentPointer | null> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('screen_id', sql.NVarChar, specId)
      .input('environment', sql.NVarChar, env)
      .query(`
        SELECT environment, version, promoted_at, promoted_by
        FROM [${this.tableName}]
        WHERE screen_id = @screen_id AND environment = @environment
      `);

    if (!result.recordset[0]) return null;

    const r = result.recordset[0];
    return {
      name: r.environment as string,
      version: r.version as number,
      promotedAt: (r.promoted_at as Date).toISOString(),
      promotedBy: r.promoted_by as string,
    };
  }

  async setEnvironment(specId: string, env: string, version: number, author: string): Promise<void> {
    const pool = await this.getPool();
    await pool.request()
      .input('screen_id', sql.NVarChar, specId)
      .input('environment', sql.NVarChar, env)
      .input('promoted_by', sql.NVarChar, author)
      .query(`
        MERGE [${this.tableName}] AS target
        USING (SELECT @screen_id AS screen_id, @environment AS environment) AS source
        ON target.screen_id = source.screen_id AND target.environment = source.environment
        WHEN MATCHED THEN
          UPDATE SET version = ${version}, promoted_at = GETUTCDATE(), promoted_by = @promoted_by
        WHEN NOT MATCHED THEN
          INSERT (screen_id, environment, version, promoted_by) VALUES (@screen_id, @environment, ${version}, @promoted_by);
      `);
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}
