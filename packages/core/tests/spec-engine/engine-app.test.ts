import { describe, it, expect } from 'vitest';
import { createSpecEngine } from '../../src/spec-engine/engine.js';
import { MemorySpecStore } from '../../src/spec-stores/memory.js';
import type { AppSpec } from '../../src/app/app-engine.js';
import type { JsonPatch } from '../../src/streaming/patch.js';

const appSpec: AppSpec = {
  type: 'app',
  name: 'Test App',
  navigation: { type: 'sidebar', initialScreen: 'home' },
  screens: { home: { label: 'Home', icon: 'house' }, settings: { label: 'Settings' } },
  tokens: { colors: { primary: '#0D9488' } },
  translations: { en: { title: 'Hello' } },
  layout: {
    root: 'main',
    elements: {
      main: { type: 'stack', props: {}, children: ['header', 'outlet'] },
      header: { type: 'text', props: { content: 'App' } },
      outlet: { type: 'screen-outlet', props: {} },
    },
  },
};

function createTestEngine(doc?: unknown) {
  const store = new MemorySpecStore(doc ? { 'app-demo': doc } : {});
  return { engine: createSpecEngine({ store }), store };
}

describe('SpecEngine with AppSpec', () => {
  it('getManifest returns app manifest format', async () => {
    const { engine } = createTestEngine(appSpec);
    const manifest = await engine.getManifest('app-demo');
    expect(manifest).toContain('app: Test App');
    expect(manifest).toContain('navigation: sidebar');
    expect(manifest).toContain('home — Home (house)');
    expect(manifest).toContain('layout: main (3 elements)');
  });

  it('getElements with dot-notation returns top-level sections', async () => {
    const { engine } = createTestEngine(appSpec);
    const result = await engine.getElements('app-demo', ['tokens.colors', 'header']);
    expect(result.found['tokens.colors']).toEqual({ primary: '#0D9488' });
    expect(result.found.header).toBeDefined();
    expect(result.notFound).toEqual([]);
  });

  it('patch tokens — success with patchedSections', async () => {
    const { engine } = createTestEngine(appSpec);
    const patches: JsonPatch[] = [
      { op: 'replace', path: '/tokens/colors/primary', value: '#2563EB' },
    ];
    const result = await engine.patch('app-demo', patches);
    expect(result.success).toBe(true);
    expect(result.patchedSections).toContain('tokens');
    expect(result.patchedElements).toEqual([]);
  });

  it('patch layout element — success with patchedElements', async () => {
    const { engine } = createTestEngine(appSpec);
    const patches: JsonPatch[] = [
      { op: 'replace', path: '/layout/elements/header/props/content', value: 'New Title' },
    ];
    const result = await engine.patch('app-demo', patches);
    expect(result.success).toBe(true);
    expect(result.patchedElements).toContain('header');
  });

  it('patch mixed — both elements and sections reported', async () => {
    const { engine } = createTestEngine(appSpec);
    const patches: JsonPatch[] = [
      { op: 'replace', path: '/tokens/colors/primary', value: '#EEE' },
      { op: 'replace', path: '/layout/elements/header/props/content', value: 'Updated' },
    ];
    const result = await engine.patch('app-demo', patches);
    expect(result.success).toBe(true);
    expect(result.patchedSections).toContain('tokens');
    expect(result.patchedElements).toContain('header');
  });

  it('invalid patch — screen ref removed post-patch fails validation', async () => {
    const { engine } = createTestEngine(appSpec);
    const patches: JsonPatch[] = [
      { op: 'remove', path: '/screens/home' },
    ];
    const result = await engine.patch('app-demo', patches);
    expect(result.success).toBe(false);
    expect(result.errors!.some(e => e.message.includes('initialScreen'))).toBe(true);
  });

  it('delete AppSpec returns spec and manifest', async () => {
    const { engine } = createTestEngine(appSpec);
    const result = await engine.delete('app-demo');
    expect((result.spec as AppSpec).type).toBe('app');
    expect(result.manifest).toContain('app: Test App');
  });

  it('cache updates after successful patch', async () => {
    const { engine } = createTestEngine(appSpec);
    await engine.patch('app-demo', [
      { op: 'replace', path: '/tokens/colors/primary', value: '#FF0000' },
    ]);
    const result = await engine.getElements('app-demo', ['tokens.colors']);
    expect((result.found['tokens.colors'] as Record<string, unknown>).primary).toBe('#FF0000');
  });

  it('screen specs still work through the same engine', async () => {
    const screenSpec = { root: 'p', elements: { p: { type: 'box', props: {} } } };
    const store = new MemorySpecStore({ 'app-demo': appSpec, 'my-screen': screenSpec });
    const engine = createSpecEngine({ store });
    const appManifest = await engine.getManifest('app-demo');
    const screenManifest = await engine.getManifest('my-screen');
    expect(appManifest).toContain('app:');
    expect(screenManifest).toContain('screen:');
  });
});
