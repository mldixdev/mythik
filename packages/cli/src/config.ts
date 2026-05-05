import fs from 'fs';
import path from 'path';

export interface MythikConfig {
  store: string;
  supabase?: { url: string; apiKey: string; table?: string };
  file?: { dir: string };
  sqlserver?: {
    server: string;
    database: string;
    user?: string;
    password?: string;
    port?: number;
    trustedConnection?: boolean;
    table?: string;
  };
}

export interface LoadConfigOptions {
  cwd?: string;
  flags?: Record<string, string>;
}

export function loadConfig(options: LoadConfigOptions = {}): MythikConfig {
  const cwd = options.cwd ?? process.cwd();
  const flags = options.flags ?? {};

  let config: MythikConfig;

  // Priority 1: CLI flags
  if (flags.store) {
    config = buildConfigFromFlags(flags);
  }
  // Priority 2: Env vars
  else if (process.env.MYTHIK_STORE) {
    config = buildConfigFromEnv();
  }
  // Priority 3: .mythikrc file (search upward)
  else {
    const rcPath = findRcFile(cwd);
    if (!rcPath) {
      throw new Error(
        `No configuration found\n\n` +
        `  Looked for .mythikrc from ${cwd} upward.\n` +
        `  Also checked: MYTHIK_STORE, MYTHIK_SUPABASE_URL env vars.\n\n` +
        `  Fix: run mythik init\n` +
        `       or create .mythikrc manually\n` +
        `       or pass --store, --url, --key flags`
      );
    }
    const raw = JSON.parse(fs.readFileSync(rcPath, 'utf-8')) as MythikConfig;
    config = resolveEnvVars(raw);
  }

  // --table flag overrides store table for any store type
  if (flags.table) {
    if (config.sqlserver) config.sqlserver.table = flags.table;
    if (config.supabase) config.supabase.table = flags.table;
  }

  return config;
}

function findRcFile(startDir: string): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, '.mythikrc');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir || dir === root) return null;
    dir = parent;
  }
}

function buildConfigFromFlags(flags: Record<string, string>): MythikConfig {
  const config: MythikConfig = { store: flags.store };

  if (flags.store === 'supabase') {
    config.supabase = { url: flags.url ?? '', apiKey: flags.key ?? '' };
  } else if (flags.store === 'sqlserver') {
    config.sqlserver = {
      server: flags.server ?? flags.url ?? '',
      database: flags.database ?? flags.db ?? '',
      user: flags.user ?? undefined,
      password: flags.password ?? undefined,
    };
  } else if (flags.store === 'file') {
    config.file = { dir: flags.dir ?? './specs' };
  }

  return config;
}

function buildConfigFromEnv(): MythikConfig {
  const store = process.env.MYTHIK_STORE!;
  const config: MythikConfig = { store };

  if (store === 'supabase') {
    config.supabase = {
      url: process.env.MYTHIK_SUPABASE_URL ?? '',
      apiKey: process.env.MYTHIK_API_KEY ?? '',
    };
  } else if (store === 'file') {
    config.file = { dir: process.env.MYTHIK_FILE_DIR ?? './specs' };
  }

  return config;
}

export function resolveEnvVars(config: MythikConfig): MythikConfig {
  const clone = structuredClone(config);

  if (clone.supabase) {
    clone.supabase.url = resolveValue(clone.supabase.url);
    clone.supabase.apiKey = resolveValue(clone.supabase.apiKey);
  }
  if (clone.file) {
    clone.file.dir = resolveValue(clone.file.dir);
  }
  if (clone.sqlserver) {
    clone.sqlserver.server = resolveValue(clone.sqlserver.server);
    clone.sqlserver.database = resolveValue(clone.sqlserver.database);
    if (clone.sqlserver.user) clone.sqlserver.user = resolveValue(clone.sqlserver.user);
    if (clone.sqlserver.password) clone.sqlserver.password = resolveValue(clone.sqlserver.password);
  }

  return clone;
}

function resolveValue(value: string): string {
  if (!value.startsWith('$')) return value;
  const envName = value.slice(1);
  const resolved = process.env[envName];
  if (resolved === undefined) {
    throw new Error(
      `Environment variable ${envName} is not set (referenced as "${value}" in .mythikrc)`
    );
  }
  return resolved;
}
