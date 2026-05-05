import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSpecStore } from '../../src/spec-stores/file.js';
import type { Spec } from '../../src/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const sampleSpec: Spec = {
  root: 'page',
  elements: {
    page: { type: 'box', props: {} },
  },
};

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svc-file-store-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('FileSpecStore', () => {
  it('saves a spec as pretty-printed JSON and loads it back', async () => {
    const store = new FileSpecStore({ directory: tmpDir });
    await store.save('dashboard', sampleSpec);

    const filePath = path.join(tmpDir, 'dashboard.json');
    const raw = fs.readFileSync(filePath, 'utf-8');

    expect(raw).toBe(JSON.stringify(sampleSpec, null, 2));

    const loaded = await store.load('dashboard');
    expect(loaded).toEqual(sampleSpec);
  });

  it('throws on load when file does not exist', async () => {
    const store = new FileSpecStore({ directory: tmpDir });
    await expect(store.load('nonexistent')).rejects.toThrow();
  });

  it('overwrites existing file on save', async () => {
    const store = new FileSpecStore({ directory: tmpDir });
    await store.save('screen', sampleSpec);

    const updated: Spec = { root: 'new', elements: { new: { type: 'text', props: {} } } };
    await store.save('screen', updated);

    const loaded = await store.load('screen');
    expect(loaded).toEqual(updated);
  });

  it('lists all screen IDs from directory', async () => {
    const store = new FileSpecStore({ directory: tmpDir });
    await store.save('alpha', sampleSpec);
    await store.save('beta', sampleSpec);
    const ids = await store.list();
    expect(ids.sort()).toEqual(['alpha', 'beta']);
  });

  it('creates directory if it does not exist', async () => {
    const nestedDir = path.join(tmpDir, 'sub', 'dir');
    const store = new FileSpecStore({ directory: nestedDir });
    await store.save('test', sampleSpec);

    const loaded = await store.load('test');
    expect(loaded).toEqual(sampleSpec);
  });
});
