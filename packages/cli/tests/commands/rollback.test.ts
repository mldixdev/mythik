import { describe, it, expect } from 'vitest';
import { runRollbackCommand } from '../../src/commands/rollback.js';
import { MemoryVersionedSpecStore, MemoryEnvironmentStore } from 'mythik';

describe('runRollbackCommand', () => {
  async function setup() {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
    await store.saveVersion('login', { root: 'page', elements: { page: { type: 'box' } } }, { author: 'alice', source: 'push' });
    await store.saveVersion('login', { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable' } } }, { author: 'bob', source: 'patch' });
    await store.saveVersion('login', { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable' }, msg: { type: 'text' } } }, { author: 'claude', source: 'patch' });
    await envStore.setEnvironment('login', 'dev', 3, 'alice');
    await envStore.setEnvironment('login', 'prod', 1, 'alice');
    return { store, envStore };
  }

  it('preview mode shows impact without executing', async () => {
    const { store, envStore } = await setup();
    const result = await runRollbackCommand('login', {
      store, envStore, toVersion: 1, confirm: false, json: false, author: 'alice',
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('LOST');
    expect(result.output).toContain('btn');
    expect(result.output).toContain('msg');
    expect(result.output).toContain('Preview only');

    expect(await store.currentVersion('login')).toBe(3);
  });

  it('confirm mode executes rollback', async () => {
    const { store, envStore } = await setup();
    const result = await runRollbackCommand('login', {
      store, envStore, toVersion: 1, confirm: true, json: false, author: 'alice',
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Rolled back');
    expect(await store.currentVersion('login')).toBe(4);
  });

  it('returns json when requested', async () => {
    const { store, envStore } = await setup();
    const result = await runRollbackCommand('login', {
      store, envStore, toVersion: 1, confirm: false, json: true, author: 'alice',
    });

    const data = JSON.parse(result.output);
    expect(data.impact).toBeDefined();
    expect(data.impact.lostChanges.length).toBeGreaterThan(0);
  });
});
