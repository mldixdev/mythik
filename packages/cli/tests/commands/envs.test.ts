import { describe, it, expect } from 'vitest';
import { runEnvs } from '../../src/commands/envs.js';
import { MemoryVersionedSpecStore, MemoryEnvironmentStore } from 'mythik';

describe('runEnvs', () => {
  async function setup() {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
    await store.saveVersion('login', { root: 'page', elements: {} }, { author: 'a', source: 'push' });
    await store.saveVersion('login', { root: 'page', elements: { btn: { type: 'touchable' } } }, { author: 'b', source: 'patch' });
    await envStore.setEnvironment('login', 'dev', 2, 'alice');
    await envStore.setEnvironment('login', 'prod', 1, 'bob');
    return { store, envStore };
  }

  it('lists environments', async () => {
    const { store, envStore } = await setup();
    const result = await runEnvs('login', { store, envStore, json: false });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('dev');
    expect(result.output).toContain('prod');
    expect(result.output).toContain('v2');
    expect(result.output).toContain('v1');
    expect(result.output).toContain('alice');
    expect(result.output).toContain('bob');
  });

  it('sets environment pointer', async () => {
    const { store, envStore } = await setup();
    const result = await runEnvs('login', { store, envStore, json: false, set: 'staging=1', author: 'carol' });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('staging');
    expect(result.output).toContain('v1');

    const env = await envStore.getEnvironment('login', 'staging');
    expect(env).toBeDefined();
    expect(env!.version).toBe(1);
  });

  it('returns json when requested', async () => {
    const { store, envStore } = await setup();
    const result = await runEnvs('login', { store, envStore, json: true });

    const data = JSON.parse(result.output);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
  });

  it('reports empty when no environments set', async () => {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();
    const result = await runEnvs('login', { store, envStore, json: false });

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('No environments');
  });

  it('rejects --set with missing equals sign', async () => {
    const { store, envStore } = await setup();
    const result = await runEnvs('login', { store, envStore, json: false, set: 'devonly' });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('Invalid --set format');
  });

  it('rejects --set with non-numeric version', async () => {
    const { store, envStore } = await setup();
    const result = await runEnvs('login', { store, envStore, json: false, set: 'dev=abc' });

    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('not a number');
  });
});
