import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runInit } from '../../src/commands/init.js';

describe('init command', () => {
  let cwd: string;
  let stdoutWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'mythik-init-'));
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(async () => {
    stdoutWrite.mockRestore();
    await rm(cwd, { recursive: true, force: true });
  });

  it('writes SQLite SQL store config non-interactively', async () => {
    const result = await runInit({ store: 'sqlite', filename: './mythik.db' }, cwd);

    expect(result.exitCode).toBe(0);
    const config = JSON.parse(await readFile(join(cwd, '.mythikrc'), 'utf8')) as Record<string, unknown>;
    expect(config).toEqual({
      store: 'sqlite',
      sql: {
        dialect: 'sqlite',
        connection: { filename: './mythik.db' },
      },
    });
  });
});
