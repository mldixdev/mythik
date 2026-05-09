import type { EnvironmentStore, SpecStore, VersionedSpecStore } from 'mythik';
import {
  MemoryEnvironmentStore,
  MemorySpecStore,
  MemoryVersionedSpecStore,
  SupabaseEnvironmentStore,
  SupabaseSpecStore,
  SupabaseVersionedSpecStore,
} from 'mythik';
import {
  createSqlDriver,
  FileSpecStore,
  SqlEnvironmentStore,
  SqlSpecStore,
  SqlVersionedSpecStore,
  type SqlDriver,
} from 'mythik/server';

import {
  isSqlStoreType,
  SUPPORTED_STORE_TYPES,
  type MythikConfig,
  type MythikSqlConfig,
} from '../config.js';

function requireSqlConfig(config: MythikConfig): MythikSqlConfig {
  if (!isSqlStoreType(config.store)) {
    throw new Error(`Store "${config.store}" is not a SQL dialect store.`);
  }
  if (!config.sql) {
    throw new Error(`SQL config for "${config.store}" is missing.`);
  }
  if (config.sql.dialect !== config.store) {
    throw new Error(`SQL config dialect "${config.sql.dialect}" does not match store "${config.store}".`);
  }
  return config.sql;
}

function createDriverBackedStore(config: MythikConfig): SqlSpecStore {
  const sql = requireSqlConfig(config);
  const driver = createSqlDriver({ dialect: sql.dialect, connection: sql.connection });
  return new SqlSpecStore({ driver, table: sql.table, closeDriver: true });
}

function sharedDriverHandle(driver: SqlDriver, ref: { count: number; closed: boolean }): SqlDriver {
  return {
    get dialect() { return driver.dialect; },
    get capabilities() { return driver.capabilities; },
    connect: () => driver.connect(),
    close: async () => {
      if (ref.closed) return;
      ref.count -= 1;
      if (ref.count <= 0) {
        ref.closed = true;
        await driver.close();
      }
    },
    transaction: (run) => driver.transaction(run),
    query: (statement, params) => driver.query(statement, params),
    exec: (statement, params) => driver.exec(statement, params),
    quoteIdent: (identifier) => driver.quoteIdent(identifier),
    quoteQualified: (...identifiers) => driver.quoteQualified(...identifiers),
    compileNamedParams: (statement, params) => driver.compileNamedParams(statement, params),
    paginate: (statement, limit, offset) => driver.paginate(statement, limit, offset),
    countQuery: (statement) => driver.countQuery(statement),
    totalsQuery: (statement) => driver.totalsQuery(statement),
    buildInsertReturning: (table, values, returning) => driver.buildInsertReturning(table, values, returning),
    buildUpdateReturning: (table, values, where, returning) => driver.buildUpdateReturning(table, values, where, returning),
    buildDelete: (table, where) => driver.buildDelete(table, where),
    buildUpsert: (table, values, keys) => driver.buildUpsert(table, values, keys),
    tableExists: (table) => driver.tableExists(table),
    mapError: (error) => driver.mapError(error),
  };
}

export function resolveStore(config: MythikConfig): SpecStore {
  switch (config.store) {
    case 'supabase':
      if (!config.supabase?.url || !config.supabase?.apiKey) {
        throw new Error('Supabase config requires "url" and "apiKey"');
      }
      return new SupabaseSpecStore(config.supabase);

    case 'sqlserver':
    case 'postgres':
    case 'mysql':
    case 'sqlite':
      return createDriverBackedStore(config);

    case 'file':
      return new FileSpecStore({ directory: config.file?.dir ?? './specs' });

    case 'memory':
      return new MemorySpecStore();

    default:
      throw new Error(`Unknown store: "${config.store}". Available: ${SUPPORTED_STORE_TYPES.join(', ')}`);
  }
}

export function resolveVersionedStore(config: MythikConfig): {
  store: VersionedSpecStore;
  envStore: EnvironmentStore;
} {
  if (config.store === 'memory') {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
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

  if (isSqlStoreType(config.store)) {
    const sql = requireSqlConfig(config);
    const driver = createSqlDriver({ dialect: sql.dialect, connection: sql.connection });
    const closeRef = { count: 2, closed: false };
    return {
      store: new SqlVersionedSpecStore({
        driver: sharedDriverHandle(driver, closeRef),
        table: sql.table,
        versionsTable: sql.versionsTable,
        snapshotInterval: sql.snapshotInterval,
        closeDriver: true,
      }),
      envStore: new SqlEnvironmentStore({
        driver: sharedDriverHandle(driver, closeRef),
        table: sql.environmentsTable,
        closeDriver: true,
      }),
    };
  }

  throw new Error(
    `Versioned store not yet available for "${config.store}". Currently supported: memory, sqlserver, postgres, mysql, sqlite, supabase.`,
  );
}
