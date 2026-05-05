import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { resolveInput } from '../src/input-resolver.js';

describe('resolveInput', () => {
  let scratchDir: string;

  beforeEach(async () => {
    scratchDir = await mkdtemp(join(tmpdir(), 'mythik-input-'));
  });

  afterEach(async () => {
    await rm(scratchDir, { recursive: true, force: true });
  });

  it('reads from file when fromFile is a path', async () => {
    const filePath = join(scratchDir, 'spec.json');
    await writeFile(filePath, '{"hello":"world"}');
    const stdin = Readable.from(['']) as unknown as NodeJS.ReadableStream;
    const result = await resolveInput({ fromFile: filePath, stdin, stdinIsTTY: true });
    expect(result).toBe('{"hello":"world"}');
  });

  it('reads from stdin when fromFile is "-"', async () => {
    const stdin = Readable.from(['line1\n', 'line2\n']) as unknown as NodeJS.ReadableStream;
    const result = await resolveInput({ fromFile: '-', stdin, stdinIsTTY: false });
    expect(result).toBe('line1\nline2');
  });

  it('reads from stdin when fromFile is undefined and stdin is piped', async () => {
    const stdin = Readable.from(['piped content']) as unknown as NodeJS.ReadableStream;
    const result = await resolveInput({ stdin, stdinIsTTY: false });
    expect(result).toBe('piped content');
  });

  it('uses positional input when provided and fromFile is undefined', async () => {
    const stdin = Readable.from(['']) as unknown as NodeJS.ReadableStream;
    const result = await resolveInput({ positional: 'inline-arg', stdin, stdinIsTTY: true });
    expect(result).toBe('inline-arg');
  });

  it('errors on missing file', async () => {
    const stdin = Readable.from(['']) as unknown as NodeJS.ReadableStream;
    await expect(
      resolveInput({ fromFile: join(scratchDir, 'nonexistent.json'), stdin, stdinIsTTY: true }),
    ).rejects.toThrow(/Could not read file/);
  });

  it('errors on conflict: fromFile + positional', async () => {
    const filePath = join(scratchDir, 'spec.json');
    await writeFile(filePath, '{}');
    const stdin = Readable.from(['']) as unknown as NodeJS.ReadableStream;
    await expect(
      resolveInput({ fromFile: filePath, positional: 'x', stdin, stdinIsTTY: true }),
    ).rejects.toThrow(/Conflicting input sources/);
  });

  it('reads from file when fromFile path is explicit and stdin is non-TTY', async () => {
    const filePath = join(scratchDir, 'spec.json');
    await writeFile(filePath, '{"from":"file"}');
    const stdin = Readable.from(['piped']) as unknown as NodeJS.ReadableStream;
    const result = await resolveInput({ fromFile: filePath, stdin, stdinIsTTY: false });
    expect(result).toBe('{"from":"file"}');
  });

  it('uses positional input when explicit and stdin is non-TTY', async () => {
    const stdin = Readable.from(['piped']) as unknown as NodeJS.ReadableStream;
    const result = await resolveInput({ positional: 'inline-arg', stdin, stdinIsTTY: false });
    expect(result).toBe('inline-arg');
  });

  it('errors when no input source available', async () => {
    const stdin = Readable.from(['']) as unknown as NodeJS.ReadableStream;
    await expect(
      resolveInput({ stdin, stdinIsTTY: true }),
    ).rejects.toThrow(/No input/);
  });
});
