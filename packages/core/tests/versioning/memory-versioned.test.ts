import { describe, it, expect } from 'vitest';
import { MemoryVersionedSpecStore, MemoryEnvironmentStore } from '../../src/spec-stores/memory-versioned.js';

describe('MemoryVersionedSpecStore', () => {
  it('saveVersion creates v1 as snapshot', async () => {
    const store = new MemoryVersionedSpecStore();
    const spec = { root: 'page', elements: { page: { type: 'box' } } };
    const version = await store.saveVersion('s1', spec, { author: 'alice', source: 'push' });
    expect(version).toBe(1);

    const entries = await store.listVersions('s1');
    expect(entries).toHaveLength(1);
    expect(entries[0].version).toBe(1);
    expect(entries[0].isSnapshot).toBe(true);
    expect(entries[0].author).toBe('alice');
    expect(entries[0].source).toBe('push');
  });

  it('saveVersion creates v2 with patches', async () => {
    const store = new MemoryVersionedSpecStore();
    const spec1 = { root: 'page', elements: { page: { type: 'box' } } };
    const spec2 = { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable' } } };

    await store.saveVersion('s1', spec1, { author: 'alice', source: 'push' });
    const v2 = await store.saveVersion('s1', spec2, { author: 'bob', source: 'patch', description: 'Added button' });
    expect(v2).toBe(2);

    const entries = await store.listVersions('s1');
    expect(entries).toHaveLength(2);
    expect(entries[0].version).toBe(2);
    expect(entries[0].isSnapshot).toBe(false);
    expect(entries[0].description).toBe('Added button');
  });

  it('loadVersion reconstructs from snapshot + patches', async () => {
    const store = new MemoryVersionedSpecStore();
    const spec1 = { root: 'page', elements: { page: { type: 'box' } } };
    const spec2 = { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable' } } };
    const spec3 = { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable', props: { label: 'Go' } } } };

    await store.saveVersion('s1', spec1, { author: 'a', source: 'push' });
    await store.saveVersion('s1', spec2, { author: 'b', source: 'patch' });
    await store.saveVersion('s1', spec3, { author: 'c', source: 'patch' });

    expect(await store.loadVersion('s1', 1)).toEqual(spec1);
    expect(await store.loadVersion('s1', 2)).toEqual(spec2);
    expect(await store.loadVersion('s1', 3)).toEqual(spec3);
  });

  it('load returns current version (backward compatible)', async () => {
    const store = new MemoryVersionedSpecStore();
    const spec1 = { a: 1 };
    const spec2 = { a: 2 };

    await store.saveVersion('s1', spec1, { author: 'a', source: 'push' });
    await store.saveVersion('s1', spec2, { author: 'b', source: 'patch' });

    expect(await store.load('s1')).toEqual(spec2);
  });

  it('currentVersion returns latest version number', async () => {
    const store = new MemoryVersionedSpecStore();
    await store.saveVersion('s1', { a: 1 }, { author: 'a', source: 'push' });
    await store.saveVersion('s1', { a: 2 }, { author: 'b', source: 'patch' });

    expect(await store.currentVersion('s1')).toBe(2);
  });

  it('currentVersion returns 0 for unknown spec', async () => {
    const store = new MemoryVersionedSpecStore();
    expect(await store.currentVersion('unknown')).toBe(0);
  });

  it('creates snapshots at configured interval', async () => {
    const store = new MemoryVersionedSpecStore({ snapshotInterval: 3 });

    for (let i = 1; i <= 6; i++) {
      await store.saveVersion('s1', { v: i }, { author: 'a', source: 'push' });
    }

    const entries = await store.listVersions('s1');
    const snapshots = entries.filter(e => e.isSnapshot);
    expect(snapshots.map(s => s.version).sort()).toEqual([1, 3, 6]);
  });

  it('listVersions respects limit', async () => {
    const store = new MemoryVersionedSpecStore();
    for (let i = 0; i < 5; i++) {
      await store.saveVersion('s1', { v: i }, { author: 'a', source: 'push' });
    }

    const entries = await store.listVersions('s1', 2);
    expect(entries).toHaveLength(2);
    expect(entries[0].version).toBe(5);
    expect(entries[1].version).toBe(4);
  });

  it('lazy bootstrap — saveVersion on existing spec creates v1 from current', async () => {
    const store = new MemoryVersionedSpecStore();
    await store.save('legacy', { old: true });

    const version = await store.saveVersion('legacy', { old: true, new: true }, { author: 'a', source: 'push' });
    expect(version).toBe(2);

    const v1 = await store.loadVersion('legacy', 1);
    expect(v1).toEqual({ old: true });

    const v2 = await store.loadVersion('legacy', 2);
    expect(v2).toEqual({ old: true, new: true });
  });
});

describe('MemoryEnvironmentStore', () => {
  it('setEnvironment creates pointer', async () => {
    const envStore = new MemoryEnvironmentStore();
    await envStore.setEnvironment('s1', 'dev', 5, 'alice');

    const env = await envStore.getEnvironment('s1', 'dev');
    expect(env).toBeDefined();
    expect(env!.name).toBe('dev');
    expect(env!.version).toBe(5);
    expect(env!.promotedBy).toBe('alice');
  });

  it('setEnvironment updates existing pointer', async () => {
    const envStore = new MemoryEnvironmentStore();
    await envStore.setEnvironment('s1', 'prod', 3, 'alice');
    await envStore.setEnvironment('s1', 'prod', 7, 'bob');

    const env = await envStore.getEnvironment('s1', 'prod');
    expect(env!.version).toBe(7);
    expect(env!.promotedBy).toBe('bob');
  });

  it('getEnvironments returns all pointers for a spec', async () => {
    const envStore = new MemoryEnvironmentStore();
    await envStore.setEnvironment('s1', 'dev', 5, 'a');
    await envStore.setEnvironment('s1', 'uat', 3, 'b');
    await envStore.setEnvironment('s1', 'prod', 1, 'c');

    const envs = await envStore.getEnvironments('s1');
    expect(envs).toHaveLength(3);
    expect(envs.map(e => e.name).sort()).toEqual(['dev', 'prod', 'uat']);
  });

  it('getEnvironment returns null for unknown', async () => {
    const envStore = new MemoryEnvironmentStore();
    expect(await envStore.getEnvironment('s1', 'dev')).toBeNull();
  });

  it('environments are isolated per spec', async () => {
    const envStore = new MemoryEnvironmentStore();
    await envStore.setEnvironment('s1', 'dev', 5, 'a');
    await envStore.setEnvironment('s2', 'dev', 10, 'b');

    expect((await envStore.getEnvironment('s1', 'dev'))!.version).toBe(5);
    expect((await envStore.getEnvironment('s2', 'dev'))!.version).toBe(10);
  });
});
