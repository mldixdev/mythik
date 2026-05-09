import { SqlSpecStore, type SqlSpecStoreConfig } from './sql.js';
import type { EnvironmentPointer, EnvironmentStore, VersionedSpecStore, VersionEntry, VersionMeta } from '../versioning/types.js';
import { computePatches } from '../versioning/compute-patches.js';
import { applyPatches } from '../streaming/patch.js';
import type { JsonPatch } from '../streaming/patch.js';
import { assertValidIdentifier } from '../security/identifier-guard.js';
import type { SqlDriver } from '../sql/index.js';

export interface SqlVersionedSpecStoreConfig extends SqlSpecStoreConfig {
  /** Table for version history. Default: 'screen_versions' */
  versionsTable?: string;
  /** Snapshot interval (full spec stored every N versions). Default: 10 */
  snapshotInterval?: number;
}

export interface SqlEnvironmentStoreConfig {
  driver: SqlDriver;
  /** Table name. Default: 'screen_environments' */
  table?: string;
  /** Close the underlying driver when close() is called. Default: false */
  closeDriver?: boolean;
}

function parseStoredJson(value: unknown): unknown {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function parseStoredPatches(value: unknown): JsonPatch[] {
  return (typeof value === 'string' ? JSON.parse(value) : value) as JsonPatch[];
}

function nowTimestamp(): Date {
  return new Date();
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  return new Date(String(value)).toISOString();
}

function booleanValue(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export class SqlVersionedSpecStore extends SqlSpecStore implements VersionedSpecStore {
  private readonly versionsTable: string;
  private readonly snapshotInterval: number;

  constructor(config: SqlVersionedSpecStoreConfig) {
    super(config);
    this.versionsTable = config.versionsTable ?? 'screen_versions';
    this.snapshotInterval = Math.max(1, Math.trunc(config.snapshotInterval ?? 10));
    assertValidIdentifier(this.versionsTable, 'SqlVersionedSpecStore.versionsTable');
  }

  async saveVersion(id: string, doc: unknown, meta: VersionMeta): Promise<number> {
    let currentMax = await this.currentVersion(id);

    if (currentMax === 0) {
      let existingSpec: unknown | null = null;
      try {
        existingSpec = await this.load(id);
      } catch {
        // No current spec: first save becomes v1.
      }

      if (existingSpec !== null && existingSpec !== undefined) {
        currentMax = 1;
        await this.insertVersionRow({
          screen_id: id,
          version: 1,
          is_snapshot: true,
          spec: JSON.stringify(existingSpec),
          patches: null,
          author: 'system',
          source_type: 'push',
          description: 'Bootstrapped from existing spec',
          created_at: nowTimestamp(),
        });
      }
    }

    const newVersion = currentMax + 1;
    const isSnapshot = newVersion === 1 || newVersion % this.snapshotInterval === 0;

    if (isSnapshot) {
      await this.insertVersionRow({
        screen_id: id,
        version: newVersion,
        is_snapshot: true,
        spec: JSON.stringify(doc),
        patches: null,
        author: meta.author,
        source_type: meta.source,
        description: meta.description ?? null,
        created_at: nowTimestamp(),
      });
    } else {
      const prevSpec = await this.loadVersion(id, currentMax);
      const patches = computePatches(prevSpec as Record<string, unknown>, doc as Record<string, unknown>);
      await this.insertVersionRow({
        screen_id: id,
        version: newVersion,
        is_snapshot: false,
        spec: null,
        patches: JSON.stringify(patches),
        author: meta.author,
        source_type: meta.source,
        description: meta.description ?? null,
        created_at: nowTimestamp(),
      });
    }

    await this.save(id, doc);

    return newVersion;
  }

  async loadVersion(id: string, version: number): Promise<unknown> {
    if (version < 1 || version > (await this.currentVersion(id))) {
      throw new Error(`Version ${version} not found for "${id}"`);
    }

    const snapshotRows = await this.driver.query<{ version: number; spec: unknown }>(
      this.driver.paginate(
        `SELECT version, spec FROM ${this.driver.quoteIdent(this.versionsTable)}
         WHERE screen_id = @id AND version <= @version AND is_snapshot = @snapshot
         ORDER BY version DESC`,
        1,
        0,
      ),
      { id, version, snapshot: true },
    );

    if (!snapshotRows[0]) {
      throw new Error(`No snapshot found for "${id}" at or before v${version}`);
    }

    const snapshotVersion = Number(snapshotRows[0].version);
    const snapshotSpec = parseStoredJson(snapshotRows[0].spec);

    if (snapshotVersion === version) {
      return snapshotSpec;
    }

    const patchRows = await this.driver.query<{ patches: unknown }>(
      `SELECT version, patches FROM ${this.driver.quoteIdent(this.versionsTable)}
       WHERE screen_id = @id AND version >= @fromVersion AND version <= @toVersion AND is_snapshot = @snapshot
       ORDER BY version ASC`,
      { id, fromVersion: snapshotVersion + 1, toVersion: version, snapshot: false },
    );

    let result = structuredClone(snapshotSpec) as Record<string, unknown>;
    for (const row of patchRows) {
      if (row.patches) {
        result = applyPatches(result, parseStoredPatches(row.patches));
      }
    }

    return result;
  }

  async listVersions(id: string, limit?: number): Promise<VersionEntry[]> {
    const baseQuery = `SELECT version, created_at, author, source_type, description, is_snapshot
      FROM ${this.driver.quoteIdent(this.versionsTable)}
      WHERE screen_id = @id
      ORDER BY version DESC`;
    const rows = await this.driver.query<{
      version: number;
      created_at: unknown;
      author: string;
      source_type: string;
      description?: string | null;
      is_snapshot: unknown;
    }>(limit ? this.driver.paginate(baseQuery, limit, 0) : baseQuery, { id });

    return rows.map((row) => ({
      version: Number(row.version),
      timestamp: toIso(row.created_at),
      author: row.author,
      source: row.source_type,
      description: row.description ?? undefined,
      isSnapshot: booleanValue(row.is_snapshot),
    }));
  }

  async currentVersion(id: string): Promise<number> {
    const rows = await this.driver.query<{ maxVersion: number | null }>(
      `SELECT MAX(version) AS ${this.driver.quoteIdent('maxVersion')} FROM ${this.driver.quoteIdent(this.versionsTable)} WHERE screen_id = @id`,
      { id },
    );
    return Number(rows[0]?.maxVersion ?? 0);
  }

  private async insertVersionRow(values: Record<string, unknown>): Promise<void> {
    await this.driver.exec(this.driver.buildInsertReturning(this.versionsTable, values, ['version']));
  }
}

export class SqlEnvironmentStore implements EnvironmentStore {
  private readonly driver: SqlDriver;
  private readonly tableName: string;
  private readonly closeDriver: boolean;

  constructor(config: SqlEnvironmentStoreConfig) {
    this.driver = config.driver;
    this.tableName = config.table ?? 'screen_environments';
    this.closeDriver = config.closeDriver ?? false;
    assertValidIdentifier(this.tableName, 'SqlEnvironmentStore.table');
  }

  async getEnvironments(specId: string): Promise<EnvironmentPointer[]> {
    const rows = await this.driver.query<{
      environment: string;
      version: number;
      promoted_at: unknown;
      promoted_by: string;
    }>(
      `SELECT environment, version, promoted_at, promoted_by
       FROM ${this.driver.quoteIdent(this.tableName)}
       WHERE screen_id = @specId
       ORDER BY environment`,
      { specId },
    );

    return rows.map((row) => this.pointerFromRow(row));
  }

  async getEnvironment(specId: string, env: string): Promise<EnvironmentPointer | null> {
    const rows = await this.driver.query<{
      environment: string;
      version: number;
      promoted_at: unknown;
      promoted_by: string;
    }>(
      `SELECT environment, version, promoted_at, promoted_by
       FROM ${this.driver.quoteIdent(this.tableName)}
       WHERE screen_id = @specId AND environment = @env`,
      { specId, env },
    );

    return rows[0] ? this.pointerFromRow(rows[0]) : null;
  }

  async setEnvironment(specId: string, env: string, version: number, author: string): Promise<void> {
    await this.driver.exec(
      this.driver.buildUpsert(
        this.tableName,
        {
          screen_id: specId,
          environment: env,
          version,
          promoted_at: nowTimestamp(),
          promoted_by: author,
        },
        ['screen_id', 'environment'],
      ),
    );
  }

  async close(): Promise<void> {
    if (this.closeDriver) {
      await this.driver.close();
    }
  }

  private pointerFromRow(row: {
    environment: string;
    version: number;
    promoted_at: unknown;
    promoted_by: string;
  }): EnvironmentPointer {
    return {
      name: row.environment,
      version: Number(row.version),
      promotedAt: toIso(row.promoted_at),
      promotedBy: row.promoted_by,
    };
  }
}
