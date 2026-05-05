import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { discoverSpecs, discoverCode } from '../../src/lint/spec-discovery.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mythik-lint-discovery-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('spec-discovery — discoverSpecs', () => {
  it('returns explicit fromFile path if .json', async () => {
    const result = await discoverSpecs({ fromFile: 'foo.json' });
    expect(result).toEqual(['foo.json']);
  });

  it('returns empty for non-json fromFile', async () => {
    const result = await discoverSpecs({ fromFile: 'foo.ts' });
    expect(result).toEqual([]);
  });

  it('walks fromDir for *.json files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'b.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'c.txt'), 'not json');
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'sub', 'd.json'), '{}');
    const result = await discoverSpecs({ fromDir: tmpDir });
    expect(result.sort().filter(p => p.endsWith('.json'))).toHaveLength(3);
    expect(result.every(p => p.endsWith('.json'))).toBe(true);
  });

  it('returns empty when no config + no flags', async () => {
    const result = await discoverSpecs({ cwd: tmpDir });
    expect(result).toEqual([]);
  });

  it('discovers via .mythikrc file store config', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    fs.mkdirSync(specsDir);
    fs.writeFileSync(path.join(specsDir, 'screen.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, '.mythikrc'), JSON.stringify({
      store: 'file',
      file: { dir: './specs' },
    }));
    const result = await discoverSpecs({ cwd: tmpDir });
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(p => p.endsWith('screen.json'))).toBe(true);
  });
});

describe('spec-discovery — discoverCode', () => {
  it('returns explicit fromFile if .ts/.tsx/.js/.jsx', async () => {
    expect(await discoverCode({ fromFile: 'foo.ts' })).toEqual(['foo.ts']);
    expect(await discoverCode({ fromFile: 'foo.tsx' })).toEqual(['foo.tsx']);
    expect(await discoverCode({ fromFile: 'foo.js' })).toEqual(['foo.js']);
  });

  it('returns empty for non-code fromFile', async () => {
    expect(await discoverCode({ fromFile: 'foo.json' })).toEqual([]);
  });

  it('walks fromDir for code files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.ts'), '');
    fs.writeFileSync(path.join(tmpDir, 'b.tsx'), '');
    fs.writeFileSync(path.join(tmpDir, 'c.json'), '{}');
    const result = await discoverCode({ fromDir: tmpDir });
    expect(result).toHaveLength(2);
  });

  it('walks codeDir default ./src when no flags', async () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir);
    fs.writeFileSync(path.join(srcDir, 'main.ts'), '');
    const result = await discoverCode({ cwd: tmpDir });
    expect(result.some(p => p.endsWith('main.ts'))).toBe(true);
  });

  it('returns empty when codeDir does not exist', async () => {
    const result = await discoverCode({ codeDir: path.join(tmpDir, 'nonexistent'), cwd: tmpDir });
    expect(result).toEqual([]);
  });
});
