import { describe, it, expect } from 'vitest';
import { computeRollbackImpact, executeRollback } from '../../src/versioning/rollback.js';
import { MemoryVersionedSpecStore, MemoryEnvironmentStore } from '../../src/spec-stores/memory-versioned.js';

describe('rollback', () => {
  async function setupHistory() {
    const store = new MemoryVersionedSpecStore();
    const envStore = new MemoryEnvironmentStore();

    const v1 = { root: 'page', elements: { page: { type: 'box' } } };
    const v2 = { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable' } } };
    const v3 = { root: 'page', elements: { page: { type: 'box' }, btn: { type: 'touchable', props: { label: 'Go' } }, msg: { type: 'text' } } };

    await store.saveVersion('s1', v1, { author: 'alice', source: 'push' });
    await store.saveVersion('s1', v2, { author: 'bob', source: 'patch', description: 'Added button' });
    await store.saveVersion('s1', v3, { author: 'claude', source: 'patch', description: 'Added label and msg' });

    await envStore.setEnvironment('s1', 'dev', 3, 'alice');
    await envStore.setEnvironment('s1', 'prod', 1, 'alice');

    return { store, envStore };
  }

  describe('computeRollbackImpact', () => {
    it('shows lost changes between current and target', async () => {
      const { store, envStore } = await setupHistory();

      const impact = await computeRollbackImpact({
        specId: 's1',
        fromVersion: 3,
        toVersion: 1,
        store,
        envStore,
      });

      expect(impact.lostChanges.length).toBeGreaterThan(0);
      const lostElementIds = impact.lostChanges
        .filter(c => c.change.kind === 'element-added')
        .map(c => c.change.elementId);
      expect(lostElementIds).toContain('btn');
      expect(lostElementIds).toContain('msg');
    });

    it('shows affected environments', async () => {
      const { store, envStore } = await setupHistory();

      const impact = await computeRollbackImpact({
        specId: 's1',
        fromVersion: 3,
        toVersion: 1,
        store,
        envStore,
      });

      const devEnv = impact.affectedEnvironments.find(e => e.name === 'dev');
      const prodEnv = impact.affectedEnvironments.find(e => e.name === 'prod');
      expect(devEnv?.affected).toBe(true);
      expect(prodEnv?.affected).toBe(false);
    });
  });

  describe('executeRollback', () => {
    it('creates new version with content of target', async () => {
      const { store, envStore } = await setupHistory();

      const result = await executeRollback({
        specId: 's1',
        toVersion: 1,
        store,
        envStore,
        author: 'alice',
        description: 'Rollback to v1',
      });

      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(3);
      expect(result.toVersion).toBe(1);
      expect(result.newVersion).toBe(4);

      const v4Spec = await store.loadVersion('s1', 4);
      const v1Spec = await store.loadVersion('s1', 1);
      expect(v4Spec).toEqual(v1Spec);
    });

    it('preserves full history — does not delete versions', async () => {
      const { store, envStore } = await setupHistory();

      await executeRollback({
        specId: 's1',
        toVersion: 1,
        store,
        envStore,
        author: 'alice',
      });

      const entries = await store.listVersions('s1');
      expect(entries).toHaveLength(4);
      expect(entries[0].version).toBe(4);
      expect(entries[0].source).toBe('rollback');
    });

    it('includes impact in result', async () => {
      const { store, envStore } = await setupHistory();

      const result = await executeRollback({
        specId: 's1',
        toVersion: 1,
        store,
        envStore,
        author: 'alice',
      });

      expect(result.impact.lostChanges.length).toBeGreaterThan(0);
      expect(result.impact.affectedEnvironments.length).toBeGreaterThan(0);
    });

    it('fails for spec with no version history', async () => {
      const store = new MemoryVersionedSpecStore();
      const envStore = new MemoryEnvironmentStore();

      const result = await executeRollback({
        specId: 'unknown',
        toVersion: 1,
        store,
        envStore,
        author: 'alice',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
