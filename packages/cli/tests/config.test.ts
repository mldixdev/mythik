import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, resolveEnvVars } from '../src/config.js';
import { resolveStore } from '../src/stores/resolver.js';
import { MemorySpecStore } from 'mythik';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('resolveEnvVars', () => {
  beforeEach(() => {
    process.env.TEST_VAR = 'resolved_value';
  });
  afterEach(() => {
    delete process.env.TEST_VAR;
  });

  it('resolves $VAR references to env values', () => {
    const config = { store: 'supabase', supabase: { url: 'https://x.co', apiKey: '$TEST_VAR' } };
    const resolved = resolveEnvVars(config);
    expect(resolved.supabase!.apiKey).toBe('resolved_value');
  });

  it('leaves non-$ values unchanged', () => {
    const config = { store: 'supabase', supabase: { url: 'https://x.co', apiKey: 'literal' } };
    const resolved = resolveEnvVars(config);
    expect(resolved.supabase!.apiKey).toBe('literal');
  });

  it('throws when env var is not set', () => {
    const config = { store: 'supabase', supabase: { url: 'https://x.co', apiKey: '$MISSING_VAR' } };
    expect(() => resolveEnvVars(config)).toThrow('MISSING_VAR');
  });
});

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mythik-test-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('reads .mythikrc from given directory', () => {
    fs.writeFileSync(path.join(tmpDir, '.mythikrc'), JSON.stringify({ store: 'memory' }));
    const config = loadConfig({ cwd: tmpDir });
    expect(config.store).toBe('memory');
  });

  it('searches upward for .mythikrc', () => {
    const subDir = path.join(tmpDir, 'a', 'b');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.mythikrc'), JSON.stringify({ store: 'memory' }));
    const config = loadConfig({ cwd: subDir });
    expect(config.store).toBe('memory');
  });

  it('CLI flags override file values', () => {
    fs.writeFileSync(path.join(tmpDir, '.mythikrc'), JSON.stringify({ store: 'memory' }));
    const config = loadConfig({ cwd: tmpDir, flags: { store: 'file', dir: './specs' } });
    expect(config.store).toBe('file');
  });

  it('env vars override file values', () => {
    fs.writeFileSync(path.join(tmpDir, '.mythikrc'), JSON.stringify({ store: 'memory' }));
    process.env.MYTHIK_STORE = 'file';
    process.env.MYTHIK_FILE_DIR = './specs';
    const config = loadConfig({ cwd: tmpDir });
    expect(config.store).toBe('file');
    delete process.env.MYTHIK_STORE;
    delete process.env.MYTHIK_FILE_DIR;
  });

  it('throws with helpful message when no config found', () => {
    expect(() => loadConfig({ cwd: tmpDir })).toThrow('No configuration found');
  });
});

describe('resolveStore', () => {
  it('returns MemorySpecStore for store=memory', () => {
    const store = resolveStore({ store: 'memory' });
    expect(store).toBeInstanceOf(MemorySpecStore);
  });

  it('throws for unknown store type', () => {
    expect(() => resolveStore({ store: 'redis' } as any)).toThrow('Unknown store');
    expect(() => resolveStore({ store: 'redis' } as any)).toThrow('supabase, sqlserver, file, memory');
  });
});
