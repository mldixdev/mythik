import { describe, it, expect } from 'vitest';
import { runDiff } from '../../src/commands/diff.js';
import { MemoryVersionedSpecStore, MemoryEnvironmentStore } from 'mythik';

describe('runDiff', () => {
  async function setup() {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
    const spec1 = { root: 'page', elements: { page: { type: 'box' } } };
    const spec2 = { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable' } } };

    await store.saveVersion('login', spec1, { author: 'a', source: 'push' });
    await store.saveVersion('login', spec2, { author: 'b', source: 'patch' });
    await envStore.setEnvironment('login', 'dev', 2, 'a');
    await envStore.setEnvironment('login', 'prod', 1, 'a');

    return { store, envStore };
  }

  it('diffs between two version numbers', async () => {
    const { store, envStore } = await setup();
    const result = await runDiff('login', { store, envStore, from: '1', to: '2', json: false });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('btn');
    expect(result.output).toContain('added');
    expect(result.output).toContain('+1');
  });

  it('diffs between environment names', async () => {
    const { store, envStore } = await setup();
    const result = await runDiff('login', { store, envStore, from: 'prod', to: 'dev', json: false });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('btn');
  });

  it('diffs from version to current when to is omitted', async () => {
    const { store, envStore } = await setup();
    const result = await runDiff('login', { store, envStore, from: '1', json: false });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('btn');
  });

  it('returns json when requested', async () => {
    const { store, envStore } = await setup();
    const result = await runDiff('login', { store, envStore, from: '1', to: '2', json: true });

    const data = JSON.parse(result.output);
    expect(data.changes).toBeDefined();
    expect(data.summary).toBeDefined();
  });

  it('shows no changes for identical versions', async () => {
    const { store, envStore } = await setup();
    const result = await runDiff('login', { store, envStore, from: '1', to: '1', json: false });

    expect(result.output).toContain('No changes');
  });
});
