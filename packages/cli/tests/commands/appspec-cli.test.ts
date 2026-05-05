import { describe, it, expect } from 'vitest';
import { runManifest } from '../../src/commands/manifest.js';
import { runElements } from '../../src/commands/elements.js';
import { runPatch } from '../../src/commands/patch.js';
import { runValidate } from '../../src/commands/validate.js';
import { runPush } from '../../src/commands/push.js';
import { runPull } from '../../src/commands/pull.js';
import { runDelete } from '../../src/commands/delete.js';
import { stripAnsi } from '../../src/output.js';
import { MemorySpecStore } from 'mythik';
import type { AppSpec } from 'mythik';

const appSpec: AppSpec = {
  type: 'app',
  name: 'Test App',
  navigation: {
    type: 'sidebar',
    initialScreen: 'home',
    auth: {
      loginScreen: 'login',
      protectedScreens: ['*'],
      roleAccess: { admin: ['*'], viewer: ['home'] },
    },
  },
  screens: {
    home: { label: 'Home', icon: 'house' },
    settings: { label: 'Settings', icon: 'gear' },
    login: { label: 'Login', statePolicy: 'reset' },
  },
  tokens: {
    colors: { primary: '#0D9488', surface: '#FFF' },
    spacing: { unit: 8 },
    components: { button: { primary: { style: { bg: 'blue' } } } },
    modes: { dark: { colors: { surface: '#1E293B' } } },
  },
  translations: {
    en: { 'title': 'Hello', 'btn': 'Save' },
    es: { 'title': 'Hola' },
  },
  sharedState: { preferences: { theme: 'light' } },
  layout: {
    root: 'main',
    elements: {
      main: { type: 'stack', props: {}, children: ['sidebar', 'outlet'] },
      sidebar: { type: 'box', props: { style: { width: 250 } }, visible: { $auth: 'isAuthenticated' } },
      outlet: { type: 'screen-outlet', props: {} },
    },
  },
};

function makeStore(doc?: unknown) {
  return new MemorySpecStore(doc ? { 'app-demo': doc } : {});
}

describe('CLI commands with AppSpec', () => {
  describe('manifest', () => {
    it('returns app manifest format', async () => {
      const result = await runManifest('app-demo', { store: makeStore(appSpec), json: false });
      const plain = stripAnsi(result.output);
      expect(plain).toContain('app: Test App');
      expect(plain).toContain('navigation: sidebar');
      expect(plain).toContain('home — Home (house)');
      expect(plain).toContain('layout: main (3 elements)');
      expect(result.exitCode).toBe(0);
    });

    it('returns JSON with app manifest', async () => {
      const result = await runManifest('app-demo', { store: makeStore(appSpec), json: true });
      const parsed = JSON.parse(result.output);
      expect(parsed.manifest).toContain('app: Test App');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('elements', () => {
    it('returns layout elements by simple ID', async () => {
      const result = await runElements('app-demo', ['sidebar'], { store: makeStore(appSpec), json: true });
      const parsed = JSON.parse(result.output);
      expect(parsed.found.sidebar.type).toBe('box');
      expect(result.exitCode).toBe(0);
    });

    it('returns top-level sections via dot-notation', async () => {
      const result = await runElements('app-demo', ['tokens.colors'], { store: makeStore(appSpec), json: true });
      const parsed = JSON.parse(result.output);
      expect(parsed.found['tokens.colors']).toEqual({ primary: '#0D9488', surface: '#FFF' });
    });

    it('handles mixed IDs + dot-notation', async () => {
      const result = await runElements('app-demo', ['sidebar', 'screens.home'], { store: makeStore(appSpec), json: true });
      const parsed = JSON.parse(result.output);
      expect(Object.keys(parsed.found)).toHaveLength(2);
      expect(parsed.found.sidebar).toBeDefined();
      expect(parsed.found['screens.home']).toBeDefined();
    });

    it('shows section type header for dot-notation results', async () => {
      const result = await runElements('app-demo', ['tokens.colors'], { store: makeStore(appSpec), json: false });
      const plain = stripAnsi(result.output);
      expect(plain).toContain('tokens.colors');
      expect(plain).toContain('section');
    });
  });

  describe('patch', () => {
    it('patches tokens and reports patchedSections', async () => {
      const store = makeStore(appSpec);
      const patches = [{ op: 'replace' as const, path: '/tokens/colors/primary', value: '#2563EB' }];
      const result = await runPatch('app-demo', patches, { store, json: false });
      const plain = stripAnsi(result.output);
      expect(plain).toContain('1 section modified (tokens)');
      expect(result.exitCode).toBe(0);
    });

    it('patches layout elements and reports patchedElements', async () => {
      const store = makeStore(appSpec);
      const patches = [{ op: 'replace' as const, path: '/layout/elements/sidebar/props/style/width', value: 300 }];
      const result = await runPatch('app-demo', patches, { store, json: false });
      const plain = stripAnsi(result.output);
      expect(plain).toContain('1 element modified (sidebar)');
      expect(result.exitCode).toBe(0);
    });

    it('mixed patch reports both elements and sections', async () => {
      const store = makeStore(appSpec);
      const patches = [
        { op: 'replace' as const, path: '/tokens/colors/primary', value: '#EEE' },
        { op: 'replace' as const, path: '/layout/elements/sidebar/props/style/width', value: 280 },
      ];
      const result = await runPatch('app-demo', patches, { store, json: false });
      const plain = stripAnsi(result.output);
      expect(plain).toContain('element');
      expect(plain).toContain('section');
      expect(result.exitCode).toBe(0);
    });

    it('rejects patch that breaks cross-reference', async () => {
      const store = makeStore(appSpec);
      const patches = [{ op: 'remove' as const, path: '/screens/home' }];
      const result = await runPatch('app-demo', patches, { store, json: false });
      const plain = stripAnsi(result.output);
      expect(plain).toContain('initialScreen');
      expect(plain).toContain('Nothing was persisted');
      expect(result.exitCode).toBe(1);
    });

    it('JSON mode returns patchedSections', async () => {
      const store = makeStore(appSpec);
      const patches = [{ op: 'replace' as const, path: '/tokens/colors/primary', value: '#000' }];
      const result = await runPatch('app-demo', patches, { store, json: true });
      const parsed = JSON.parse(result.output);
      expect(parsed.patchedSections).toContain('tokens');
      expect(parsed.patchedElements).toEqual([]);
    });
  });

  describe('validate', () => {
    it('validates valid AppSpec', async () => {
      const result = await runValidate('app-demo', { store: makeStore(appSpec), json: false });
      expect(result.exitCode).toBe(0);
      expect(stripAnsi(result.output)).toContain('3 elements');
    });

    it('detects cross-reference errors in AppSpec', async () => {
      const broken = { ...appSpec, navigation: { ...appSpec.navigation, initialScreen: 'nonexistent' } };
      const result = await runValidate('app-demo', { store: makeStore(broken), json: false });
      expect(result.exitCode).toBe(1);
      expect(stripAnsi(result.output)).toContain('nonexistent');
    });

    it('JSON mode works with AppSpec', async () => {
      const result = await runValidate('app-demo', { store: makeStore(appSpec), json: true });
      const parsed = JSON.parse(result.output);
      expect(parsed.valid).toBe(true);
      expect(parsed.elementCount).toBe(3);
    });
  });

  describe('push', () => {
    it('pushes AppSpec and returns app manifest', async () => {
      const store = new MemorySpecStore();
      const result = await runPush('app-demo', JSON.stringify(appSpec), { store, json: false, force: false });
      expect(result.exitCode).toBe(0);
      const plain = stripAnsi(result.output);
      expect(plain).toContain('app-demo');
      expect(plain).toContain('new');
      const loaded = await store.load('app-demo');
      expect((loaded as AppSpec).type).toBe('app');
    });

    it('JSON mode returns correct elementCount for AppSpec', async () => {
      const store = new MemorySpecStore();
      const result = await runPush('app-demo', JSON.stringify(appSpec), { store, json: true, force: false });
      const parsed = JSON.parse(result.output);
      expect(parsed.success).toBe(true);
      expect(parsed.elementCount).toBe(3);
    });

    it('rejects invalid AppSpec on existing screen without --force', async () => {
      const store = makeStore(appSpec);
      const broken = { ...appSpec, navigation: { ...appSpec.navigation, initialScreen: 'ghost' } };
      const result = await runPush('app-demo', JSON.stringify(broken), { store, json: false, force: false });
      expect(result.exitCode).toBe(1);
      expect(stripAnsi(result.output)).toContain('Rejected');
    });
  });

  describe('pull', () => {
    it('pulls AppSpec as complete JSON', async () => {
      const result = await runPull('app-demo', { store: makeStore(appSpec), json: false, toon: false });
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.output);
      expect(parsed.type).toBe('app');
      expect(parsed.navigation.type).toBe('sidebar');
    });
  });

  describe('delete', () => {
    it('previews with layout element count', async () => {
      const result = await runDelete('app-demo', { store: makeStore(appSpec), json: false, confirm: false });
      expect(result.exitCode).toBe(0);
      expect(stripAnsi(result.output)).toContain('3 elements');
      expect(stripAnsi(result.output)).toContain('--confirm');
    });

    it('deletes and outputs full AppSpec', async () => {
      const store = makeStore(appSpec);
      const result = await runDelete('app-demo', { store, json: false, confirm: true });
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.output);
      expect(parsed.type).toBe('app');
      await expect(store.load('app-demo')).rejects.toThrow('not found');
    });
  });
});
