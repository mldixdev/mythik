import { describe, it, expect } from 'vitest';
import { runPromoteCommand } from '../../src/commands/promote.js';
import { MemoryVersionedSpecStore, MemoryEnvironmentStore } from 'mythik';

describe('runPromoteCommand', () => {
  async function setup() {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
    const spec = { root: 'page', elements: { page: { type: 'box' } } };

    await store.saveVersion('login', spec, { author: 'a', source: 'push' });
    await envStore.setEnvironment('login', 'dev', 1, 'a');

    return { store, envStore };
  }

  it('preview mode shows validation without promoting', async () => {
    const { store, envStore } = await setup();
    const result = await runPromoteCommand({
      store, envStore, specIds: ['login'], fromEnv: 'dev', toEnv: 'prod',
      confirm: false, json: false,
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Spec validation');
    expect(result.output).toContain('Preview only');

    expect(await envStore.getEnvironment('login', 'prod')).toBeNull();
  });

  it('confirm mode promotes and sets environment pointer', async () => {
    const { store, envStore } = await setup();
    const result = await runPromoteCommand({
      store, envStore, specIds: ['login'], fromEnv: 'dev', toEnv: 'prod',
      confirm: true, json: false, author: 'alice',
    });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('Promoted');

    const prod = await envStore.getEnvironment('login', 'prod');
    expect(prod).toBeDefined();
    expect(prod!.version).toBe(1);
  });

  it('blocks when contract validation fails', async () => {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();

    const screen = {
      root: 'page',
      initialActions: [
        { action: 'fetch', params: { url: '/api/nonexistent', method: 'GET', target: '/d' } },
      ],
      elements: { page: { type: 'box' } },
    };
    const apiSpec = { type: 'api', endpoints: { items: { path: '/api/items', method: 'GET', handler: 'h' } } };

    await store.saveVersion('s1', screen, { author: 'a', source: 'push' });
    await store.saveVersion('my-api', apiSpec, { author: 'a', source: 'push' });
    await envStore.setEnvironment('s1', 'dev', 1, 'a');
    await envStore.setEnvironment('my-api', 'prod', 1, 'a');

    const result = await runPromoteCommand({
      store, envStore, specIds: ['s1'], fromEnv: 'dev', toEnv: 'prod',
      confirm: true, json: false, apiIds: ['my-api'],
    });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('blocked');
  });

  it('returns json when requested', async () => {
    const { store, envStore } = await setup();
    const result = await runPromoteCommand({
      store, envStore, specIds: ['login'], fromEnv: 'dev', toEnv: 'prod',
      confirm: false, json: true,
    });

    const data = JSON.parse(result.output);
    expect(data.validation).toBeDefined();
  });

  it('promotes multiple specs in batch mode', async () => {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();

    const screen1 = { root: 'page', elements: { page: { type: 'box' } } };
    const screen2 = { root: 'page', elements: { page: { type: 'box' } } };
    const appSpec = { type: 'app', screens: { s1: { label: 'Screen 1' }, s2: { label: 'Screen 2' } } };

    await store.saveVersion('my-app', appSpec, { author: 'a', source: 'push' });
    await store.saveVersion('s1', screen1, { author: 'a', source: 'push' });
    await store.saveVersion('s2', screen2, { author: 'a', source: 'push' });
    await envStore.setEnvironment('my-app', 'dev', 1, 'a');
    await envStore.setEnvironment('s1', 'dev', 1, 'a');
    await envStore.setEnvironment('s2', 'dev', 1, 'a');

    const result = await runPromoteCommand({
      store, envStore, specIds: ['my-app', 's1', 's2'], fromEnv: 'dev', toEnv: 'prod',
      confirm: true, json: false, author: 'alice',
    });

    expect(result.exitCode).toBe(0);
    expect(await envStore.getEnvironment('my-app', 'prod')).toBeDefined();
    expect(await envStore.getEnvironment('s1', 'prod')).toBeDefined();
    expect(await envStore.getEnvironment('s2', 'prod')).toBeDefined();
  });
});
