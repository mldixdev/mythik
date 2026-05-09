import fs from 'fs';
import path from 'path';
import type { CommandResult } from './manifest.js';
import { formatSuccess, formatError } from '../output.js';
import { isSqlStoreType } from '../config.js';

export interface InitFlags {
  store?: string;
  url?: string;
  key?: string;
  dir?: string;
  filename?: string;
  connection?: string;
  server?: string;
  database?: string;
  user?: string;
  password?: string;
  port?: string;
}

export async function runInit(flags: InitFlags, cwd: string): Promise<CommandResult> {
  const rcPath = path.join(cwd, '.mythikrc');

  if (fs.existsSync(rcPath)) {
    return {
      output: formatError({
        what: '.mythikrc already exists',
        why: `Found at ${rcPath}`,
        fix: 'Delete it first if you want to reconfigure',
      }),
      exitCode: 1,
    };
  }

  let config: Record<string, unknown>;

  if (flags.store) {
    // Non-interactive mode
    config = buildConfig(flags);
  } else if (process.stdin.isTTY) {
    // Interactive mode
    config = await interactiveInit();
  } else {
    return {
      output: formatError({
        what: 'Cannot run init interactively',
        why: 'No TTY detected and no --store flag provided',
        fix: 'Pass --store, --url, --key flags for non-interactive init',
      }),
      exitCode: 1,
    };
  }

  // Validate connection for supabase
  if (config.store === 'supabase') {
    const sub = config.supabase as { url: string; apiKey: string };
    try {
      const res = await fetch(`${sub.url}/rest/v1/screens?select=id&limit=100`, {
        headers: { apikey: sub.apiKey, Authorization: `Bearer ${sub.apiKey}` },
      });
      if (!res.ok) {
        return {
          output: formatError({
            what: 'Connection verification failed',
            why: `${res.status} ${res.statusText}`,
            fix: 'Check your Supabase URL and API key',
          }),
          exitCode: 2,
        };
      }
      const rows = await res.json() as Array<{ id: string }>;
      const screenCount = rows.length;
      process.stdout.write(formatSuccess(`Connection verified — ${screenCount} screen${screenCount !== 1 ? 's' : ''} found`) + '\n');
    } catch (err) {
      return {
        output: formatError({
          what: 'Connection verification failed',
          why: (err as Error).message,
          fix: 'Check your Supabase URL is correct and reachable',
        }),
        exitCode: 2,
      };
    }
  }

  // Write config (with $VAR placeholder for apiKey)
  const writeConfig = structuredClone(config);
  if (writeConfig.store === 'supabase') {
    (writeConfig.supabase as Record<string, string>).apiKey = '$MYTHIK_API_KEY';
  }

  fs.writeFileSync(rcPath, JSON.stringify(writeConfig, null, 2) + '\n');
  process.stdout.write(formatSuccess(`.mythikrc created at ${rcPath}`) + '\n');

  // Add to .gitignore
  const gitignorePath = path.join(cwd, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    if (!content.includes('.mythikrc')) {
      fs.appendFileSync(gitignorePath, '\n.mythikrc\n');
      process.stdout.write(formatSuccess('.mythikrc added to .gitignore') + '\n');
    }
  }

  return { output: '', exitCode: 0 };
}

function buildConfig(flags: InitFlags): Record<string, unknown> {
  const config: Record<string, unknown> = { store: flags.store };

  if (flags.store === 'supabase') {
    if (!flags.url || !flags.key) {
      throw new Error('Supabase store requires --url and --key flags');
    }
    config.supabase = { url: flags.url, apiKey: flags.key };
  } else if (flags.store && isSqlStoreType(flags.store)) {
    config.sql = buildSqlConfig(flags);
  } else if (flags.store === 'file') {
    config.file = { dir: flags.dir ?? './specs' };
  }

  return config;
}

function buildSqlConfig(flags: InitFlags): Record<string, unknown> {
  if (!flags.store || !isSqlStoreType(flags.store)) {
    throw new Error('SQL store requires a supported SQL dialect');
  }

  if (flags.store === 'sqlite') {
    return {
      dialect: 'sqlite',
      connection: { filename: flags.filename ?? flags.url ?? './mythik.db' },
    };
  }

  if (flags.store === 'sqlserver') {
    return {
      dialect: 'sqlserver',
      connection: {
        server: flags.server ?? flags.url ?? '',
        database: flags.database ?? '',
        user: flags.user,
        password: flags.password,
        port: flags.port ? Number.parseInt(flags.port, 10) : undefined,
      },
    };
  }

  return {
    dialect: flags.store,
    connection: flags.connection ?? flags.url ?? '',
  };
}

async function interactiveInit(): Promise<Record<string, unknown>> {
  const { select, input, password } = await import('@inquirer/prompts');

  const store = await select({
    message: 'Select store type:',
    choices: [
      { value: 'supabase', name: 'Supabase' },
      { value: 'sqlite', name: 'SQLite' },
      { value: 'postgres', name: 'PostgreSQL' },
      { value: 'mysql', name: 'MySQL' },
      { value: 'sqlserver', name: 'SQL Server' },
      { value: 'file', name: 'File (local JSON)' },
      { value: 'memory', name: 'Memory (testing)' },
    ],
  });

  const config: Record<string, unknown> = { store };

  if (store === 'supabase') {
    const url = await input({ message: 'Supabase URL:' });
    const apiKey = await password({ message: 'API Key (service_role):' });
    config.supabase = { url, apiKey };
  } else if (store === 'file') {
    const dir = await input({ message: 'Specs directory:', default: './specs' });
    config.file = { dir };
  } else if (store === 'sqlite') {
    const filename = await input({ message: 'SQLite database file:', default: './mythik.db' });
    config.sql = { dialect: 'sqlite', connection: { filename } };
  } else if (store === 'postgres' || store === 'mysql') {
    const url = await input({ message: `${store === 'postgres' ? 'PostgreSQL' : 'MySQL'} URL:` });
    config.sql = { dialect: store, connection: url };
  } else if (store === 'sqlserver') {
    const server = await input({ message: 'SQL Server host:' });
    const database = await input({ message: 'Database name:' });
    const user = await input({ message: 'User:', default: '' });
    const passwordValue = await password({ message: 'Password:', mask: '*' });
    config.sql = {
      dialect: 'sqlserver',
      connection: {
        server,
        database,
        user: user || undefined,
        password: passwordValue || undefined,
      },
    };
  }

  return config;
}
