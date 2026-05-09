import { createSqlDriver, getSqlStoreDdl, type SqlDialect } from 'mythik/server';

import type { CommandResult } from './manifest.js';
import { formatError, formatSuccess } from '../output.js';

export interface InitStoreOptions {
  dialect: SqlDialect;
  target?: string;
  url?: string;
  server?: string;
  database?: string;
  user?: string;
  password?: string;
  port?: string | number;
  encrypt?: string | boolean;
  trustServerCertificate?: boolean;
  dryRun?: boolean;
}

const SQL_DIALECTS: readonly SqlDialect[] = ['sqlserver', 'postgres', 'mysql', 'sqlite'];

function isSqlDialect(value: string): value is SqlDialect {
  return SQL_DIALECTS.includes(value as SqlDialect);
}

function parseOptionalBoolean(value: string | boolean | undefined): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === undefined) return undefined;
  if (/^(true|1|yes)$/i.test(value)) return true;
  if (/^(false|0|no)$/i.test(value)) return false;
  return undefined;
}

export function connectionFor(options: InitStoreOptions): unknown {
  if (options.dialect === 'sqlite') {
    return { filename: options.target ?? './mythik.db' };
  }
  if (options.dialect === 'sqlserver' && options.url === undefined && options.server) {
    const port = options.port === undefined ? undefined : Number(options.port);
    const sqlOptions: Record<string, unknown> = {};
    const encrypt = parseOptionalBoolean(options.encrypt);
    if (encrypt !== undefined) sqlOptions.encrypt = encrypt;
    if (options.trustServerCertificate === true) sqlOptions.trustServerCertificate = true;

    return {
      server: options.server,
      ...(options.database ? { database: options.database } : {}),
      ...(options.user ? { user: options.user } : {}),
      ...(options.password ? { password: options.password } : {}),
      ...(Number.isFinite(port) ? { port } : {}),
      ...(Object.keys(sqlOptions).length > 0 ? { options: sqlOptions } : {}),
    };
  }
  return options.url ?? undefined;
}

function ddlOutput(dialect: SqlDialect): string {
  return getSqlStoreDdl(dialect).join('\n\n');
}

export async function runInitStore(options: InitStoreOptions): Promise<CommandResult> {
  if (!isSqlDialect(options.dialect)) {
    return {
      output: formatError({
        what: 'Unsupported SQL dialect',
        why: `Received "${String(options.dialect)}"`,
        fix: `Use one of: ${SQL_DIALECTS.join(', ')}`,
      }),
      exitCode: 1,
    };
  }

  if (options.dryRun === true) {
    return {
      output: ddlOutput(options.dialect),
      exitCode: 0,
    };
  }

  const driver = createSqlDriver({ dialect: options.dialect, connection: connectionFor(options) });
  try {
    await driver.connect();
    for (const statement of getSqlStoreDdl(options.dialect)) {
      await driver.exec(statement);
    }
    const target = options.dialect === 'sqlite' ? ` at ${options.target ?? './mythik.db'}` : '';
    return {
      output: formatSuccess(`Initialized ${options.dialect} Mythik store${target}`),
      exitCode: 0,
    };
  } catch (error) {
    const target = options.dialect === 'sqlite' ? ` Target: ${options.target ?? './mythik.db'}.` : '';
    return {
      output: formatError({
        what: `Could not initialize ${options.dialect} Mythik store`,
        why: `${error instanceof Error ? error.message : String(error)}${target}`,
        fix:
          options.dialect === 'sqlite'
            ? 'Install optional dependency better-sqlite3 and verify the target path is writable'
            : 'Use --dry-run to inspect DDL, or provide a reachable database URL',
      }),
      exitCode: 1,
    };
  } finally {
    await driver.close();
  }
}
