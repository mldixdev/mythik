import { describe, it, expect, vi } from 'vitest';
import { createSpecEngine } from '../../src/spec-engine/engine.js';
import { MemorySpecStore } from '../../src/spec-stores/memory.js';
import type { Spec } from '../../src/types.js';
import type { JsonPatch } from '../../src/streaming/patch.js';

const baseSpec: Spec = {
  root: 'page',
  initialActions: [
    { action: 'fetch', params: { url: 'https://api.test/data', method: 'GET', target: '/items' } },
  ],
  elements: {
    page: {
      type: 'stack',
      props: { direction: 'vertical' },
      children: ['title', 'btn'],
    },
    title: {
      type: 'text',
      props: { content: 'Hello' },
    },
    btn: {
      type: 'button',
      props: { label: 'Click' },
      on: { press: { action: 'navigate', params: { screen: 'next' } } },
    },
  },
};

function createTestEngine(spec?: Spec) {
  const store = new MemorySpecStore(spec ? { 'test-screen': spec } : {});
  return { engine: createSpecEngine({ store }), store };
}

describe('SpecEngine', () => {
  describe('getManifest', () => {
    it('returns a manifest string for a valid screen', async () => {
      const { engine } = createTestEngine(baseSpec);
      const manifest = await engine.getManifest('test-screen');
      expect(manifest).toContain('screen: page (3 elements)');
      expect(manifest).toContain('root: page (stack)');
      expect(manifest).toContain('title (text)');
      expect(manifest).toContain('btn (button)');
    });

    it('uses cache on second call (no duplicate store.load)', async () => {
      const store = new MemorySpecStore({ 'test-screen': baseSpec });
      const loadSpy = vi.spyOn(store, 'load');
      const engine = createSpecEngine({ store });

      await engine.getManifest('test-screen');
      await engine.getManifest('test-screen');

      expect(loadSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getElements', () => {
    it('returns found elements and notFound IDs', async () => {
      const { engine } = createTestEngine(baseSpec);
      const result = await engine.getElements('test-screen', ['title', 'nonexistent']);
      expect(result.found.title).toEqual(baseSpec.elements.title);
      expect(result.notFound).toEqual(['nonexistent']);
    });
  });

  describe('patch — success', () => {
    it('applies patches, persists, and returns success with manifest', async () => {
      const { engine, store } = createTestEngine(baseSpec);

      const patches: JsonPatch[] = [
        { op: 'add', path: '/elements/subtitle', value: { type: 'text', props: { content: 'World' } } },
        { op: 'add', path: '/elements/page/children/-', value: 'subtitle' },
      ];

      const result = await engine.patch('test-screen', patches);

      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.elementCount).toBe(4);
      expect(result.patchedElements).toContain('subtitle');
      expect(result.patchedElements).toContain('page');
      expect(result.manifest).toContain('4 elements');
      expect(result.manifest).toContain('subtitle (text)');

      // Verify persisted
      const saved = await store.load('test-screen');
      expect(saved.elements.subtitle).toBeDefined();
    });

    it('updates cache after successful patch', async () => {
      const { engine } = createTestEngine(baseSpec);

      await engine.patch('test-screen', [
        { op: 'replace', path: '/elements/title/props/content', value: 'Updated' },
      ]);

      const result = await engine.getElements('test-screen', ['title']);
      expect(result.found.title.props?.content).toBe('Updated');
    });
  });

  describe('patch — bad patch (invalid operation)', () => {
    it('returns success:false with error when patch test fails', async () => {
      const { engine, store } = createTestEngine(baseSpec);

      const patches: JsonPatch[] = [
        { op: 'test', path: '/elements/title/props/content', value: 'WRONG VALUE' },
      ];

      const result = await engine.patch('test-screen', patches);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);

      // Original spec unchanged
      const saved = await store.load('test-screen');
      expect(saved.elements.title.props?.content).toBe('Hello');
    });
  });

  describe('patch — validation failure', () => {
    it('returns success:false with validation errors and does NOT persist', async () => {
      const { engine, store } = createTestEngine(baseSpec);

      // Add an orphan child that doesn't exist in elements
      const patches: JsonPatch[] = [
        { op: 'add', path: '/elements/page/children/-', value: 'ghost-element' },
      ];

      const result = await engine.patch('test-screen', patches);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.manifest).toContain('ghost-element (MISSING)');

      // Original spec unchanged
      const saved = await store.load('test-screen');
      expect(saved.elements.page.children).toEqual(['title', 'btn']);
    });
  });

  describe('patch — atomicity', () => {
    it('does not persist partial patches when one fails mid-array', async () => {
      const { engine, store } = createTestEngine(baseSpec);

      const patches: JsonPatch[] = [
        { op: 'add', path: '/elements/new-el', value: { type: 'text', props: {} } },
        { op: 'test', path: '/elements/title/props/content', value: 'WRONG' },
        { op: 'add', path: '/elements/another', value: { type: 'box', props: {} } },
      ];

      const result = await engine.patch('test-screen', patches);
      expect(result.success).toBe(false);

      const saved = await store.load('test-screen');
      expect(saved.elements['new-el']).toBeUndefined();
    });
  });

  describe('patch — patchedElements extraction', () => {
    it('extracts element IDs from patch paths, deduped', async () => {
      const { engine } = createTestEngine(baseSpec);

      const patches: JsonPatch[] = [
        { op: 'replace', path: '/elements/title/props/content', value: 'New' },
        { op: 'replace', path: '/elements/title/props/variant', value: 'heading' },
        { op: 'replace', path: '/elements/btn/props/label', value: 'Go' },
        { op: 'add', path: '/initialActions/-', value: { action: 'setState', params: { statePath: '/x', value: 1 } } },
      ];

      const result = await engine.patch('test-screen', patches);
      expect(result.success).toBe(true);
      expect(result.patchedElements.sort()).toEqual(['btn', 'title']);
    });
  });

  describe('delete', () => {
    it('returns spec and manifest of deleted screen', async () => {
      const { engine, store } = createTestEngine(baseSpec);
      const result = await engine.delete('test-screen');
      expect(result.spec).toEqual(baseSpec);
      expect(result.manifest).toContain('page');
      await expect(store.load('test-screen')).rejects.toThrow('not found');
    });

    it('throws when screen does not exist', async () => {
      const { engine } = createTestEngine();
      await expect(engine.delete('nonexistent')).rejects.toThrow('not found');
    });

    it('clears cache after delete', async () => {
      const { engine, store } = createTestEngine(baseSpec);
      // Load into cache
      await engine.getManifest('test-screen');
      // Delete
      await engine.delete('test-screen');
      // Re-add to store directly
      await store.save('test-screen', { root: 'new', elements: { new: { type: 'box', props: {} } } });
      // Should load fresh, not cached
      const manifest = await engine.getManifest('test-screen');
      expect(manifest).toContain('new');
      expect(manifest).not.toContain('title');
    });
  });
});
