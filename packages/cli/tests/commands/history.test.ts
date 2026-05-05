import { describe, it, expect } from 'vitest';
import { runHistory } from '../../src/commands/history.js';
import { MemoryVersionedSpecStore, MemoryEnvironmentStore } from 'mythik';

describe('runHistory', () => {
  async function setup() {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
    const spec1 = { root: 'page', elements: { page: { type: 'box' } } };
    const spec2 = { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable' } } };

    await store.saveVersion('login', spec1, { author: 'alice', source: 'push', description: 'Initial' });
    await store.saveVersion('login', spec2, { author: 'bob', source: 'patch', description: 'Added button' });
    await envStore.setEnvironment('login', 'dev', 2, 'alice');
    await envStore.setEnvironment('login', 'prod', 1, 'alice');

    return { store, envStore };
  }

  it('shows version history with environments', async () => {
    const { store, envStore } = await setup();
    const result = await runHistory('login', { store, envStore, json: false });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('v2');
    expect(result.output).toContain('v1');
    expect(result.output).toContain('bob');
    expect(result.output).toContain('alice');
    expect(result.output).toContain('[DEV]');
    expect(result.output).toContain('[PROD]');
  });

  it('shows descriptions', async () => {
    const { store, envStore } = await setup();
    const result = await runHistory('login', { store, envStore, json: false });

    expect(result.output).toContain('Initial');
    expect(result.output).toContain('Added button');
  });

  it('respects limit', async () => {
    const { store, envStore } = await setup();
    const result = await runHistory('login', { store, envStore, json: false, limit: 1 });

    expect(result.output).toContain('v2');
    expect(result.output).not.toContain('v1');
  });

  it('returns json when requested', async () => {
    const { store, envStore } = await setup();
    const result = await runHistory('login', { store, envStore, json: true });

    const data = JSON.parse(result.output);
    expect(data).toHaveLength(2);
    expect(data[0].version).toBe(2);
  });

  it('errors for unknown spec', async () => {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
    const result = await runHistory('unknown', { store, envStore, json: false });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('No version history');
  });
});
