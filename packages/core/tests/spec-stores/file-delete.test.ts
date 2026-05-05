import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSpecStore } from '../../src/spec-stores/file.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { Spec } from '../../src/types.js';

const spec: Spec = { root: 'p', elements: { p: { type: 'box', props: {} } } };
let dir: string;

beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-del-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('FileSpecStore.delete', () => {
  it('deletes an existing spec file', async () => {
    const store = new FileSpecStore({ directory: dir });
    await store.save('test', spec);
    await store.delete('test');
    const list = await store.list();
    expect(list).toEqual([]);
  });

  it('throws on delete when file does not exist', async () => {
    const store = new FileSpecStore({ directory: dir });
    await expect(store.delete('nonexistent')).rejects.toThrow('not found');
  });
});
