import { SupabaseSpecStore, type SupabaseSpecStoreConfig } from './supabase.js';
import type { VersionedSpecStore, EnvironmentStore, VersionMeta, VersionEntry, EnvironmentPointer } from '../versioning/types.js';
import { computePatches } from '../versioning/compute-patches.js';
import { applyPatches } from '../streaming/patch.js';
import type { JsonPatch } from '../streaming/patch.js';

export interface SupabaseVersionedSpecStoreConfig extends SupabaseSpecStoreConfig {
  /** Table for version history. Default: 'screen_versions' */
  versionsTable?: string;
  /** Snapshot interval (full spec stored every N versions). Default: 10 */
  snapshotInterval?: number;
}

export class SupabaseVersionedSpecStore extends SupabaseSpecStore implements VersionedSpecStore {
  private versionsTable: string;
  private snapshotInterval: number;
  private vUrl: string;
  private vApiKey: string;

  constructor(config: SupabaseVersionedSpecStoreConfig) {
    super(config);
    this.versionsTable = config.versionsTable ?? 'screen_versions';
    this.snapshotInterval = config.snapshotInterval ?? 10;
    this.vUrl = config.url;
    this.vApiKey = config.apiKey;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.vApiKey,
      Authorization: `Bearer ${this.vApiKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  async currentVersion(id: string): Promise<number> {
    const res = await fetch(
      `${this.vUrl}/rest/v1/${this.versionsTable}?screen_id=eq.${encodeURIComponent(id)}&select=version&order=version.desc&limit=1`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error(`currentVersion failed: ${res.status} ${res.statusText}`);
    const rows = await res.json() as Array<{ version: number }>;
    return rows.length > 0 ? rows[0].version : 0;
  }

  async saveVersion(id: string, doc: unknown, meta: VersionMeta): Promise<number> {
    let currentMax = await this.currentVersion(id);

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
        await this.postVersion({
          screen_id: id,
          version: 1,
          is_snapshot: true,
          spec: existingSpec,
          author: 'system',
          source_type: 'push',
          description: 'Bootstrapped from existing spec',
        });
      }
    }

    const newVersion = currentMax + 1;
    const isSnapshot = newVersion === 1 || newVersion % this.snapshotInterval === 0;

    if (isSnapshot) {
      await this.postVersion({
        screen_id: id,
        version: newVersion,
        is_snapshot: true,
        spec: doc,
        author: meta.author,
        source_type: meta.source,
        description: meta.description ?? null,
      });
    } else {
      const prevSpec = await this.loadVersion(id, currentMax);
      const patches = computePatches(prevSpec as Record<string, unknown>, doc as Record<string, unknown>);
      await this.postVersion({
        screen_id: id,
        version: newVersion,
        is_snapshot: false,
        patches,
        author: meta.author,
        source_type: meta.source,
        description: meta.description ?? null,
      });
    }

    // Update current spec in base table
    await this.save(id, doc);

    return newVersion;
  }

  private async postVersion(record: Record<string, unknown>): Promise<void> {
    const res = await fetch(
      `${this.vUrl}/rest/v1/${this.versionsTable}`,
      {
        method: 'POST',
        headers: this.headers({ Prefer: 'return=minimal' }),
        body: JSON.stringify(record),
      },
    );
    if (!res.ok) throw new Error(`postVersion failed: ${res.status} ${res.statusText}`);
  }

  async loadVersion(id: string, version: number): Promise<unknown> {
    // Find nearest snapshot at or before target version
    const snapshotRes = await fetch(
      `${this.vUrl}/rest/v1/${this.versionsTable}?screen_id=eq.${encodeURIComponent(id)}&version=lte.${version}&is_snapshot=eq.true&order=version.desc&limit=1&select=version,spec`,
      { headers: this.headers() },
    );
    if (!snapshotRes.ok) throw new Error(`loadVersion snapshot query failed: ${snapshotRes.status}`);
    const snapshots = await snapshotRes.json() as Array<{ version: number; spec: unknown }>;

    if (snapshots.length === 0) {
      throw new Error(`No snapshot found for "${id}" at or before v${version}`);
    }

    const snapshotVersion = snapshots[0].version;
    const snapshotSpec = snapshots[0].spec;

    if (snapshotVersion === version) {
      return snapshotSpec;
    }

    // Apply patches from snapshot+1 to target version
    const patchRes = await fetch(
      `${this.vUrl}/rest/v1/${this.versionsTable}?screen_id=eq.${encodeURIComponent(id)}&version=gt.${snapshotVersion}&version=lte.${version}&is_snapshot=eq.false&order=version.asc&select=version,patches`,
      { headers: this.headers() },
    );
    if (!patchRes.ok) throw new Error(`loadVersion patches query failed: ${patchRes.status}`);
    const patchRows = await patchRes.json() as Array<{ version: number; patches: JsonPatch[] }>;

    let result = structuredClone(snapshotSpec) as Record<string, unknown>;
    for (const row of patchRows) {
      if (row.patches) {
        result = applyPatches(result, row.patches);
      }
    }

    return result;
  }

  async listVersions(id: string, limit?: number): Promise<VersionEntry[]> {
    const limitParam = limit ? `&limit=${limit}` : '';
    const res = await fetch(
      `${this.vUrl}/rest/v1/${this.versionsTable}?screen_id=eq.${encodeURIComponent(id)}&order=version.desc${limitParam}&select=version,created_at,author,source_type,description,is_snapshot`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error(`listVersions failed: ${res.status}`);
    const rows = await res.json() as Array<Record<string, unknown>>;

    return rows.map(r => ({
      version: r.version as number,
      timestamp: r.created_at as string,
      author: r.author as string,
      source: r.source_type as string,
      description: r.description as string | undefined,
      isSnapshot: !!(r.is_snapshot),
    }));
  }
}

// --- Environment Store ---

export interface SupabaseEnvironmentStoreConfig {
  url: string;
  apiKey: string;
  /** Table name. Default: 'screen_environments' */
  table?: string;
}

export class SupabaseEnvironmentStore implements EnvironmentStore {
  private url: string;
  private apiKey: string;
  private tableName: string;

  constructor(config: SupabaseEnvironmentStoreConfig) {
    this.url = config.url;
    this.apiKey = config.apiKey;
    this.tableName = config.table ?? 'screen_environments';
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      apikey: this.apiKey,
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  async getEnvironments(specId: string): Promise<EnvironmentPointer[]> {
    const res = await fetch(
      `${this.url}/rest/v1/${this.tableName}?screen_id=eq.${encodeURIComponent(specId)}&order=environment`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error(`getEnvironments failed: ${res.status}`);
    const rows = await res.json() as Array<Record<string, unknown>>;
    return rows.map(r => ({
      name: r.environment as string,
      version: r.version as number,
      promotedAt: r.promoted_at as string,
      promotedBy: r.promoted_by as string,
    }));
  }

  async getEnvironment(specId: string, env: string): Promise<EnvironmentPointer | null> {
    const res = await fetch(
      `${this.url}/rest/v1/${this.tableName}?screen_id=eq.${encodeURIComponent(specId)}&environment=eq.${encodeURIComponent(env)}`,
      { headers: this.headers() },
    );
    if (!res.ok) throw new Error(`getEnvironment failed: ${res.status}`);
    const rows = await res.json() as Array<Record<string, unknown>>;
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      name: r.environment as string,
      version: r.version as number,
      promotedAt: r.promoted_at as string,
      promotedBy: r.promoted_by as string,
    };
  }

  async setEnvironment(specId: string, env: string, version: number, author: string): Promise<void> {
    const res = await fetch(
      `${this.url}/rest/v1/${this.tableName}?on_conflict=screen_id,environment`,
      {
        method: 'POST',
        headers: this.headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify({
          screen_id: specId,
          environment: env,
          version,
          promoted_by: author,
          promoted_at: new Date().toISOString(),
        }),
      },
    );
    if (!res.ok) throw new Error(`setEnvironment failed: ${res.status}`);
  }
}
