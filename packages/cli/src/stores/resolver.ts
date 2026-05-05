import type { SpecStore, VersionedSpecStore, EnvironmentStore } from 'mythik';
import type { MythikConfig } from '../config.js';
import { MemorySpecStore, SupabaseSpecStore, MemoryVersionedSpecStore, MemoryEnvironmentStore, SupabaseVersionedSpecStore, SupabaseEnvironmentStore } from 'mythik';
import { FileSpecStore, SqlServerSpecStore, SqlServerVersionedSpecStore, SqlServerEnvironmentStore } from 'mythik/server';

export function resolveStore(config: MythikConfig): SpecStore {
  switch (config.store) {
    case 'supabase':
      if (!config.supabase?.url || !config.supabase?.apiKey) {
        throw new Error('Supabase config requires "url" and "apiKey"');
      }
      return new SupabaseSpecStore(config.supabase);

    case 'sqlserver':
      if (!config.sqlserver?.server || !config.sqlserver?.database) {
        throw new Error('SQL Server config requires "server" and "database"');
      }
      return new SqlServerSpecStore(config.sqlserver);

    case 'file':
      return new FileSpecStore({ directory: config.file?.dir ?? './specs' });

    case 'memory':
      return new MemorySpecStore();

    default:
      throw new Error(
        `Unknown store: "${config.store}". Available: supabase, sqlserver, file, memory`
      );
  }
}

/**
 * Resolve a VersionedSpecStore + EnvironmentStore from config.
 * Currently only memory store has a versioned implementation.
 */
export function resolveVersionedStore(config: MythikConfig): { store: VersionedSpecStore; envStore: EnvironmentStore } {
  if (config.store === 'memory') {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
    return { store, envStore };
  }

  if (config.store === 'sqlserver') {
    if (!config.sqlserver?.server || !config.sqlserver?.database) {
      throw new Error('SQL Server config requires "server" and "database"');
    }
    const store = new SqlServerVersionedSpecStore(config.sqlserver);
    // Environment store uses its own fixed table — don't pass the --table override
    const { table: _, ...envConfig } = config.sqlserver;
    const envStore = new SqlServerEnvironmentStore(envConfig);
    return { store, envStore };
  }

  if (config.store === 'supabase') {
    if (!config.supabase?.url || !config.supabase?.apiKey) {
      throw new Error('Supabase config requires "url" and "apiKey"');
    }
    const store = new SupabaseVersionedSpecStore(config.supabase);
    const { table: _, ...envConfig } = config.supabase;
    const envStore = new SupabaseEnvironmentStore(envConfig);
    return { store, envStore };
  }

  throw new Error(
    `Versioned store not yet available for "${config.store}". Currently supported: memory, sqlserver, supabase.`
  );
}
