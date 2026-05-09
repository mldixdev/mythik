import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as serverEntry from '../src/server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_ROOT = resolve(__dirname, '..');
const SRC_ROOT = resolve(CORE_ROOT, 'src');

async function readSource(relativePath: string): Promise<string> {
  return readFile(resolve(SRC_ROOT, relativePath), 'utf8');
}

describe('SQL server-side public boundary', () => {
  it('exports SQL boundary placeholders from mythik/server only', () => {
    expect(serverEntry).toHaveProperty('createSqlDriver');
  });

  it('keeps the default mythik entry free of SQL driver runtime exports', async () => {
    const indexSource = await readSource('index.ts');

    expect(indexSource).not.toMatch(/createSqlDriver/);
    expect(indexSource).not.toMatch(/SqlDriver/);
    expect(indexSource).not.toMatch(/\.\/sql\//);
  });

  it('does not statically import optional SQL drivers from the default entry source', async () => {
    const indexSource = await readSource('index.ts');

    expect(indexSource).not.toMatch(/from ['"](mssql|pg|mysql2|better-sqlite3)['"]/);
    expect(indexSource).not.toMatch(/import ['"](mssql|pg|mysql2|better-sqlite3)['"]/);
  });
});
