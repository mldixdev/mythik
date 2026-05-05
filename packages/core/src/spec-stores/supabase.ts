import type { SpecStore } from '../spec-engine/types.js';

export interface SupabaseSpecStoreConfig {
  url: string;
  apiKey: string;
  /** Table name for spec storage. Default: 'screens' */
  table?: string;
}

export class SupabaseSpecStore implements SpecStore {
  private url: string;
  private apiKey: string;
  private tableName: string;

  constructor(config: SupabaseSpecStoreConfig) {
    this.url = config.url;
    this.apiKey = config.apiKey;
    this.tableName = config.table ?? 'screens';
  }

  async load(screenId: string): Promise<unknown> {
    const res = await fetch(
      `${this.url}/rest/v1/${this.tableName}?id=eq.${encodeURIComponent(screenId)}&select=spec`,
      {
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error(`SupabaseSpecStore.load failed: ${res.status} ${res.statusText}`);
    }

    const rows = await res.json();
    if (!rows[0]?.spec) {
      throw new Error(`Spec "${screenId}" not found`);
    }

    return rows[0].spec;
  }

  async save(screenId: string, spec: unknown): Promise<void> {
    const res = await fetch(
      `${this.url}/rest/v1/${this.tableName}?id=eq.${encodeURIComponent(screenId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ spec }),
      },
    );

    if (!res.ok) {
      throw new Error(`SupabaseSpecStore.save failed: ${res.status} ${res.statusText}`);
    }
  }

  async list(): Promise<string[]> {
    const res = await fetch(
      `${this.url}/rest/v1/${this.tableName}?select=id&order=id`,
      {
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.apiKey}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error(`SupabaseSpecStore.list failed: ${res.status} ${res.statusText}`);
    }

    const rows = await res.json() as Array<{ id: string }>;
    return rows.map(r => r.id);
  }

  async delete(screenId: string): Promise<void> {
    const res = await fetch(
      `${this.url}/rest/v1/${this.tableName}?id=eq.${encodeURIComponent(screenId)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: this.apiKey,
          Authorization: `Bearer ${this.apiKey}`,
          Prefer: 'return=minimal',
        },
      },
    );

    if (!res.ok) {
      throw new Error(`SupabaseSpecStore.delete failed: ${res.status} ${res.statusText}`);
    }
  }
}
