import { describe, it, expect } from 'vitest';
import { generateAppManifest } from '../../src/spec-engine/app-manifest.js';
import type { AppSpec } from '../../src/app/app-engine.js';

const fullAppSpec: AppSpec = {
  type: 'app',
  name: 'Test App',
  navigation: {
    type: 'sidebar',
    initialScreen: 'dashboard',
    breadcrumb: 'history',
    auth: {
      loginScreen: 'login',
      protectedScreens: ['*'],
      roleAccess: { admin: ['*'], viewer: ['dashboard'] },
      persistence: 'local',
      tokenRefresh: true,
      authDomains: ['api.example.com'],
    },
  },
  screens: {
    dashboard: { label: 'Dashboard', icon: 'chart' },
    settings: { label: 'Settings', icon: 'gear' },
    login: { label: 'Login', icon: 'sign-in', statePolicy: 'reset' },
  },
  tokens: {
    colors: { primary: '#0D9488', surface: '#FFF', text: '#000' },
    spacing: { unit: 8 },
    components: {
      button: { primary: { style: {} }, danger: { style: {} } },
      box: { card: { style: {} } },
    },
    modes: { dark: { colors: { surface: '#1E293B' } } },
  },
  translations: {
    en: { 'app.title': 'Test', 'btn.save': 'Save', 'btn.cancel': 'Cancel' },
    es: { 'app.title': 'Prueba', 'btn.save': 'Guardar' },
  },
  sharedState: { preferences: { theme: 'light' }, items: [] },
  templates: { 'stat-card': { type: 'box', props: {} } },
  layout: {
    root: 'main',
    elements: {
      main: { type: 'stack', props: {}, children: ['sidebar', 'content'] },
      sidebar: { type: 'box', props: {}, visible: { $auth: 'isAuthenticated' }, children: ['nav'] },
      nav: { type: 'stack', props: {}, repeat: { statePath: '/app/screens' }, children: ['nav-item'] },
      'nav-item': { type: 'touchable', props: {}, on: { press: { action: 'navigate', params: { screen: { $item: 'id' } } } } },
      content: { type: 'box', props: {}, children: ['outlet'] },
      outlet: { type: 'screen-outlet', props: {} },
    },
  },
};

describe('generateAppManifest', () => {
  it('includes app header with name and counts', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('app: Test App (3 screens, 2 locales)');
  });

  it('includes navigation config', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('navigation: sidebar, initial: dashboard, breadcrumb: history');
  });

  it('includes auth section when present', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('auth: enabled');
    expect(manifest).toContain('roleAccess: admin(*), viewer(dashboard)');
    expect(manifest).toContain('authDomains: api.example.com');
  });

  it('includes screens list', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('dashboard — Dashboard (chart)');
    expect(manifest).toContain('settings — Settings (gear)');
    expect(manifest).toContain('login — Login (sign-in) [statePolicy: reset]');
  });

  it('includes token summary with component variants', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('colors(3)');
    expect(manifest).toContain('spacing(1)');
    expect(manifest).toContain('components: button(primary, danger), box(card)');
    expect(manifest).toContain('modes: dark');
  });

  it('includes translation summary with key counts', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('en(3 keys)');
    expect(manifest).toContain('es(2 keys)');
  });

  it('shows translation key mismatch warning', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('missing');
  });

  it('includes sharedState root keys', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('sharedState: preferences, items');
  });

  it('includes templates', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('templates: stat-card');
  });

  it('includes layout tree with correct element count', () => {
    const manifest = generateAppManifest(fullAppSpec);
    expect(manifest).toContain('layout: main (6 elements)');
    expect(manifest).toContain('root: main (stack)');
    expect(manifest).toContain('sidebar (box)');
    expect(manifest).toContain('nav-item (touchable)');
    expect(manifest).toContain('outlet (screen-outlet)');
  });

  it('generates clean manifest without optionals', () => {
    const minimal: AppSpec = {
      type: 'app',
      navigation: { type: 'tabs', initialScreen: 'home' },
      screens: { home: { label: 'Home' } },
      layout: { root: 'page', elements: { page: { type: 'box', props: {} } } },
    };
    const manifest = generateAppManifest(minimal);
    expect(manifest).toContain('app:');
    expect(manifest).toContain('1 screen');
    expect(manifest).not.toContain('auth:');
    expect(manifest).not.toContain('translations:');
    expect(manifest).toContain('layout: page (1 element)');
  });
});
