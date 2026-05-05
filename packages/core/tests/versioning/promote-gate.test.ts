import { describe, it, expect } from 'vitest';
import { runPromoteGate } from '../../src/versioning/promote-gate.js';
import { MemoryVersionedSpecStore, MemoryEnvironmentStore } from '../../src/spec-stores/memory-versioned.js';

describe('runPromoteGate', () => {
  function setupStores() {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
    return { store, envStore };
  }

  it('passes for valid screen spec', async () => {
    const { store, envStore } = setupStores();
    const spec = { root: 'page', elements: { page: { type: 'box' } } };
    await store.saveVersion('s1', spec, { author: 'a', source: 'push' });
    await envStore.setEnvironment('s1', 'dev', 1, 'a');

    const result = await runPromoteGate({
      specIds: ['s1'],
      fromEnv: 'dev',
      toEnv: 'prod',
      store,
      envStore,
    });

    expect(result.success).toBe(true);
    expect(result.validation.specValid).toBe(true);
    expect(result.validation.contractSkipped).toBe(true);
  });

  it('reports cross-screen warning for missing referenced screen', async () => {
    const { store, envStore } = setupStores();
    const spec = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn'] },
        btn: { type: 'touchable', on: { press: { action: 'navigate', params: { screen: 'settings' } } } },
      },
    };
    await store.saveVersion('s1', spec, { author: 'a', source: 'push' });
    await envStore.setEnvironment('s1', 'dev', 1, 'a');

    const result = await runPromoteGate({
      specIds: ['s1'],
      fromEnv: 'dev',
      toEnv: 'prod',
      store,
      envStore,
    });

    expect(result.validation.crossScreenValid).toBe(false);
    expect(result.validation.warnings.length).toBeGreaterThan(0);
    expect(result.validation.warnings[0].message).toContain('settings');
    expect(result.success).toBe(true); // Warning does NOT block
  });

  it('cross-screen passes when referenced screen is in the batch', async () => {
    const { store, envStore } = setupStores();
    const screen1 = {
      root: 'page',
      elements: {
        page: { type: 'box', children: ['btn'] },
        btn: { type: 'touchable', on: { press: { action: 'navigate', params: { screen: 'settings' } } } },
      },
    };
    const screen2 = { root: 'page', elements: { page: { type: 'box' } } };

    await store.saveVersion('s1', screen1, { author: 'a', source: 'push' });
    await store.saveVersion('settings', screen2, { author: 'a', source: 'push' });
    await envStore.setEnvironment('s1', 'dev', 1, 'a');
    await envStore.setEnvironment('settings', 'dev', 1, 'a');

    const result = await runPromoteGate({
      specIds: ['s1', 'settings'],
      fromEnv: 'dev',
      toEnv: 'prod',
      store,
      envStore,
    });

    expect(result.validation.crossScreenValid).toBe(true);
    expect(result.validation.warnings).toHaveLength(0);
  });

  it('runs contract validation when apiIds provided', async () => {
    const { store, envStore } = setupStores();
    const screen = {
      root: 'page',
      initialActions: [
        { action: 'fetch', params: { url: '/api/items', method: 'GET', target: '/d' } },
      ],
      elements: { page: { type: 'box' } },
    };
    const apiSpec = {
      type: 'api',
      endpoints: { items: { path: '/api/items', method: 'GET', handler: 'h' } },
    };

    await store.saveVersion('s1', screen, { author: 'a', source: 'push' });
    await store.saveVersion('my-api', apiSpec, { author: 'a', source: 'push' });
    await envStore.setEnvironment('s1', 'dev', 1, 'a');
    await envStore.setEnvironment('my-api', 'prod', 1, 'a');

    const result = await runPromoteGate({
      specIds: ['s1'],
      fromEnv: 'dev',
      toEnv: 'prod',
      store,
      envStore,
      apiIds: ['my-api'],
    });

    expect(result.validation.contractSkipped).toBeFalsy();
    expect(result.validation.contractValid).toBe(true);
  });

  it('blocks when contract validation fails', async () => {
    const { store, envStore } = setupStores();
    const screen = {
      root: 'page',
      initialActions: [
        { action: 'fetch', params: { url: '/api/nonexistent', method: 'GET', target: '/d' } },
      ],
      elements: { page: { type: 'box' } },
    };
    const apiSpec = {
      type: 'api',
      endpoints: { items: { path: '/api/items', method: 'GET', handler: 'h' } },
    };

    await store.saveVersion('s1', screen, { author: 'a', source: 'push' });
    await store.saveVersion('my-api', apiSpec, { author: 'a', source: 'push' });
    await envStore.setEnvironment('s1', 'dev', 1, 'a');
    await envStore.setEnvironment('my-api', 'prod', 1, 'a');

    const result = await runPromoteGate({
      specIds: ['s1'],
      fromEnv: 'dev',
      toEnv: 'prod',
      store,
      envStore,
      apiIds: ['my-api'],
    });

    expect(result.success).toBe(false);
    expect(result.validation.contractValid).toBe(false);
    expect(result.validation.errors.length).toBeGreaterThan(0);
  });

  it('uses batch api-spec version when api-spec is in the batch', async () => {
    const { store, envStore } = setupStores();
    const screen = {
      root: 'page',
      initialActions: [
        { action: 'fetch', params: { url: '/api/v2/items', method: 'GET', target: '/d' } },
      ],
      elements: { page: { type: 'box' } },
    };
    const apiV1 = { type: 'api', endpoints: { items: { path: '/api/items', method: 'GET', handler: 'h' } } };
    const apiV2 = { type: 'api', endpoints: { itemsV2: { path: '/api/v2/items', method: 'GET', handler: 'h' } } };

    await store.saveVersion('my-api', apiV1, { author: 'a', source: 'push' });
    await envStore.setEnvironment('my-api', 'prod', 1, 'a');
    await store.saveVersion('my-api', apiV2, { author: 'a', source: 'push' });
    await envStore.setEnvironment('my-api', 'dev', 2, 'a');

    await store.saveVersion('s1', screen, { author: 'a', source: 'push' });
    await envStore.setEnvironment('s1', 'dev', 1, 'a');

    const result = await runPromoteGate({
      specIds: ['s1', 'my-api'],
      fromEnv: 'dev',
      toEnv: 'prod',
      store,
      envStore,
      apiIds: ['my-api'],
    });

    expect(result.validation.contractValid).toBe(true);
  });
});
