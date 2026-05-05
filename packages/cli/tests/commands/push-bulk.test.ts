import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPushBulk } from '../../src/commands/push-bulk.js';
import { MemorySpecStore, MemoryVersionedSpecStore } from 'mythik';
import type { Spec } from 'mythik';

const validSpec: Spec = {
  root: 'page',
  elements: {
    page: { type: 'box', props: {}, children: ['title'] },
    title: { type: 'text', props: { content: 'Hello' } },
  },
};

const invalidSpec: Spec = {
  root: 'page',
  elements: {
    page: { type: 'box', props: {}, children: ['ghost'] },
  },
};

describe('runPushBulk', () => {
  let scratchDir: string;

  beforeEach(async () => {
    scratchDir = await mkdtemp(join(tmpdir(), 'mythik-bulk-'));
  });

  afterEach(async () => {
    await rm(scratchDir, { recursive: true, force: true });
  });

  it('saves all valid specs and returns summary', async () => {
    await writeFile(join(scratchDir, 'foo.json'), JSON.stringify(validSpec));
    await writeFile(join(scratchDir, 'bar.json'), JSON.stringify(validSpec));
    const store = new MemorySpecStore();
    const result = await runPushBulk(scratchDir, { store, json: false, force: false });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('foo');
    expect(result.output).toContain('bar');
    expect(result.output).toContain('2 specs processed: 2 saved');
    expect(await store.list()).toEqual(expect.arrayContaining(['foo', 'bar']));
  });

  it('reports per-spec failures + continues processing', async () => {
    await writeFile(join(scratchDir, 'foo.json'), JSON.stringify(validSpec));
    await writeFile(join(scratchDir, 'bar.json'), JSON.stringify(invalidSpec));
    await writeFile(join(scratchDir, 'baz.json'), JSON.stringify(validSpec));
    // Pre-seed bar so push rejects (existing + invalid + no-force)
    const store = new MemorySpecStore({ bar: validSpec });
    const result = await runPushBulk(scratchDir, { store, json: false, force: false });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('foo');
    expect(result.output).toContain('bar');
    expect(result.output).toContain('baz');
    expect(result.output).toContain('rejected');
    // foo and baz should be saved (continue-on-error); bar still original
    const fooSpec = await store.load('foo');
    const bazSpec = await store.load('baz');
    expect(fooSpec.elements.title).toBeDefined();
    expect(bazSpec.elements.title).toBeDefined();
  });

  it('returns JSON structure when json=true', async () => {
    await writeFile(join(scratchDir, 'foo.json'), JSON.stringify(validSpec));
    await writeFile(join(scratchDir, 'bar.json'), JSON.stringify(validSpec));
    const store = new MemorySpecStore();
    const result = await runPushBulk(scratchDir, { store, json: true, force: false });
    const parsed = JSON.parse(result.output);
    expect(parsed.summary.total).toBe(2);
    expect(parsed.summary.saved).toBe(2);
    expect(parsed.summary.rejected).toBe(0);
    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[0]).toHaveProperty('id');
    expect(parsed.results[0]).toHaveProperty('success');
  });

  it('errors on empty directory', async () => {
    const store = new MemorySpecStore();
    const result = await runPushBulk(scratchDir, { store, json: false, force: false });
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('No');
    expect(result.output).toContain('.json');
  });

  it('errors on non-existent directory', async () => {
    const store = new MemorySpecStore();
    const result = await runPushBulk(join(scratchDir, 'does-not-exist'), { store, json: false, force: false });
    expect(result.exitCode).toBe(1);
  });

  it('overwrites existing specs with --force', async () => {
    await writeFile(join(scratchDir, 'foo.json'), JSON.stringify(invalidSpec));
    const store = new MemorySpecStore({ foo: validSpec });
    const result = await runPushBulk(scratchDir, { store, json: false, force: true });
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('1 saved');
  });

  it('uses filename stem as id (ignores subdirectories)', async () => {
    await writeFile(join(scratchDir, 'screen-foo.json'), JSON.stringify(validSpec));
    const store = new MemorySpecStore();
    await runPushBulk(scratchDir, { store, json: false, force: false });
    expect(await store.list()).toContain('screen-foo');
  });

  it('ignores non-.json files', async () => {
    await writeFile(join(scratchDir, 'foo.json'), JSON.stringify(validSpec));
    await writeFile(join(scratchDir, 'README.md'), '# not a spec');
    await writeFile(join(scratchDir, 'config.yaml'), 'foo: bar');
    const store = new MemorySpecStore();
    const result = await runPushBulk(scratchDir, { store, json: false, force: false });
    expect(result.exitCode).toBe(0);
    expect(await store.list()).toEqual(['foo']);
  });

  it('forwards --author per-spec to versioned save', async () => {
    await writeFile(join(scratchDir, 'foo.json'), JSON.stringify(validSpec));
    await writeFile(join(scratchDir, 'bar.json'), JSON.stringify(validSpec));
    const store = new MemoryVersionedSpecStore();
    const result = await runPushBulk(scratchDir, {
      store,
      json: false,
      force: false,
      author: 'jules',
      description: 'bulk seed',
    });
    expect(result.exitCode).toBe(0);
    const fooVersions = await store.listVersions('foo');
    const barVersions = await store.listVersions('bar');
    expect(fooVersions).toHaveLength(1);
    expect(barVersions).toHaveLength(1);
    expect(fooVersions[0].author).toBe('jules');
    expect(barVersions[0].author).toBe('jules');
  });
});
