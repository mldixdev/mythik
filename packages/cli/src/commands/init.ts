import fs from 'fs';
import path from 'path';
import type { CommandResult } from './manifest.js';
import { formatSuccess, formatError } from '../output.js';

export interface InitFlags {
  store?: string;
  url?: string;
  key?: string;
  dir?: string;
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
  } else if (flags.store === 'file') {
    config.file = { dir: flags.dir ?? './specs' };
  }

  return config;
}

async function interactiveInit(): Promise<Record<string, unknown>> {
  const { select, input, password } = await import('@inquirer/prompts');

  const store = await select({
    message: 'Select store type:',
    choices: [
      { value: 'supabase', name: 'Supabase' },
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
  }

  return config;
}
