import { describe, it, expect } from 'vitest';
import { MemorySpecStore } from '../../src/spec-stores/memory.js';
import type { Spec } from '../../src/types.js';

const sampleSpec: Spec = {
  root: 'page',
  elements: {
    page: { type: 'box', props: {} },
  },
};

const anotherSpec: Spec = {
  root: 'dashboard',
  elements: {
    dashboard: { type: 'stack', props: {}, children: ['title'] },
    title: { type: 'text', props: { content: 'Hi' } },
  },
};

describe('MemorySpecStore', () => {
  it('loads a spec that was provided in constructor', async () => {
    const store = new MemorySpecStore({ 'my-screen': sampleSpec });
    const loaded = await store.load('my-screen');
    expect(loaded).toEqual(sampleSpec);
  });

  it('throws on load when screenId does not exist', async () => {
    const store = new MemorySpecStore();
    await expect(store.load('nonexistent')).rejects.toThrow('Spec "nonexistent" not found');
  });

  it('saves a new spec and loads it back', async () => {
    const store = new MemorySpecStore();
    await store.save('dashboard', anotherSpec);
    const loaded = await store.load('dashboard');
    expect(loaded).toEqual(anotherSpec);
  });

  it('overwrites an existing spec on save', async () => {
    const store = new MemorySpecStore({ 'my-screen': sampleSpec });
    await store.save('my-screen', anotherSpec);
    const loaded = await store.load('my-screen');
    expect(loaded).toEqual(anotherSpec);
  });

  it('lists all screen IDs', async () => {
    const store = new MemorySpecStore({ 'screen-a': sampleSpec, 'screen-b': anotherSpec });
    const ids = await store.list();
    expect(ids.sort()).toEqual(['screen-a', 'screen-b']);
  });

  it('returns empty array when no specs', async () => {
    const store = new MemorySpecStore();
    const ids = await store.list();
    expect(ids).toEqual([]);
  });

  it('deletes an existing spec', async () => {
    const store = new MemorySpecStore({ 'my-screen': sampleSpec });
    await store.delete('my-screen');
    await expect(store.load('my-screen')).rejects.toThrow('not found');
    const list = await store.list();
    expect(list).toEqual([]);
  });

  it('throws on delete when screenId does not exist', async () => {
    const store = new MemorySpecStore();
    await expect(store.delete('nonexistent')).rejects.toThrow('not found');
  });

  it('stores independent copies (no shared references)', async () => {
    const store = new MemorySpecStore();
    await store.save('test', sampleSpec);
    const loaded = await store.load('test');
    (loaded as Record<string, unknown>).root = 'mutated';
    const reloaded = await store.load('test');
    expect(reloaded.root).toBe('page');
  });
});
