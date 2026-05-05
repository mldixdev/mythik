import { MemorySpecStore } from './memory.js';
import type { VersionedSpecStore, EnvironmentStore, VersionMeta, VersionEntry, VersionRecord, EnvironmentPointer } from '../versioning/types.js';
import { computePatches } from '../versioning/compute-patches.js';
import { applyPatches } from '../streaming/patch.js';

export interface MemoryVersionedSpecStoreConfig {
  snapshotInterval?: number;
}

export class MemoryVersionedSpecStore extends MemorySpecStore implements VersionedSpecStore {
  private versions = new Map<string, VersionRecord[]>();
  private snapshotInterval: number;

  constructor(config?: MemoryVersionedSpecStoreConfig) {
    super();
    this.snapshotInterval = config?.snapshotInterval ?? 10;
  }

  async saveVersion(id: string, doc: unknown, meta: VersionMeta): Promise<number> {
    const records = this.versions.get(id) ?? [];

    // Lazy bootstrap: if spec exists but no history, create v1 from current
    if (records.length === 0) {
      let existingSpec: unknown | null = null;
      try {
        existingSpec = await this.load(id);
      } catch {
        // No existing spec — first save becomes v1
      }

      if (existingSpec !== null && existingSpec !== undefined) {
        const bootstrapRecord: VersionRecord = {
          version: 1,
          timestamp: new Date().toISOString(),
          author: 'system',
          source: 'push',
          description: 'Bootstrapped from existing spec',
          isSnapshot: true,
          spec: structuredClone(existingSpec),
        };
        records.push(bootstrapRecord);
        this.versions.set(id, records);
      }
    }

    const version = records.length + 1;
    const isSnapshot = version === 1 || version % this.snapshotInterval === 0;

    const record: VersionRecord = {
      version,
      timestamp: new Date().toISOString(),
      author: meta.author,
      source: meta.source,
      description: meta.description,
      isSnapshot,
    };

    if (isSnapshot) {
      record.spec = structuredClone(doc);
    } else {
      const prevSpec = await this.reconstructSpec(records, version - 1);
      record.patches = computePatches(prevSpec as Record<string, unknown>, doc as Record<string, unknown>);
    }

    records.push(record);
    this.versions.set(id, records);

    // Update current spec (SpecStore base)
    await this.save(id, doc);

    return version;
  }

  async loadVersion(id: string, version: number): Promise<unknown> {
    const records = this.versions.get(id);
    if (!records || version < 1 || version > records.length) {
      throw new Error(`Version ${version} not found for "${id}"`);
    }
    return this.reconstructSpec(records, version);
  }

  async listVersions(id: string, limit?: number): Promise<VersionEntry[]> {
    const records = this.versions.get(id) ?? [];
    const entries: VersionEntry[] = records.map(r => ({
      version: r.version,
      timestamp: r.timestamp,
      author: r.author,
      source: r.source,
      description: r.description,
      isSnapshot: r.isSnapshot,
    }));
    entries.reverse(); // Newest first
    return limit ? entries.slice(0, limit) : entries;
  }

  async currentVersion(id: string): Promise<number> {
    const records = this.versions.get(id);
    return records ? records.length : 0;
  }

  private async reconstructSpec(records: VersionRecord[], version: number): Promise<unknown> {
    // Find nearest snapshot at or before target version
    let snapshotIdx = -1;
    for (let i = version - 1; i >= 0; i--) {
      if (records[i].isSnapshot) {
        snapshotIdx = i;
        break;
      }
    }

    if (snapshotIdx === -1) {
      throw new Error(`No snapshot found at or before v${version}`);
    }

    let result = structuredClone(records[snapshotIdx].spec) as Record<string, unknown>;

    for (let i = snapshotIdx + 1; i < version; i++) {
      if (records[i].patches) {
        result = applyPatches(result, records[i].patches!);
      }
    }

    return result;
  }
}

export class MemoryEnvironmentStore implements EnvironmentStore {
  private envs = new Map<string, Map<string, EnvironmentPointer>>();

  async getEnvironments(specId: string): Promise<EnvironmentPointer[]> {
    const specEnvs = this.envs.get(specId);
    return specEnvs ? Array.from(specEnvs.values()) : [];
  }

  async getEnvironment(specId: string, env: string): Promise<EnvironmentPointer | null> {
    return this.envs.get(specId)?.get(env) ?? null;
  }

  async setEnvironment(specId: string, env: string, version: number, author: string): Promise<void> {
    if (!this.envs.has(specId)) {
      this.envs.set(specId, new Map());
    }
    this.envs.get(specId)!.set(env, {
      name: env,
      version,
      promotedAt: new Date().toISOString(),
      promotedBy: author,
    });
  }
}
