import { describe, it, expect } from 'vitest';
import { getAppElements } from '../../src/spec-engine/app-elements.js';
import type { AppSpec } from '../../src/app/app-engine.js';

const appSpec: AppSpec = {
  type: 'app',
  navigation: { type: 'sidebar', initialScreen: 'home', auth: { loginScreen: 'login', protectedScreens: ['*'], roleAccess: { admin: ['*'] } } },
  screens: { home: { label: 'Home', icon: 'house' }, login: { label: 'Login' } },
  tokens: { colors: { primary: '#0D9488', surface: '#FFF' }, components: { button: { primary: { style: { bg: 'blue' } } } } },
  translations: { en: { 'app.title': 'Test' }, es: { 'app.title': 'Prueba' } },
  sharedState: { preferences: { theme: 'light' } },
  layout: {
    root: 'main',
    elements: {
      main: { type: 'stack', props: {}, children: ['sidebar'] },
      sidebar: { type: 'box', props: { style: { width: 250 } } },
    },
  },
};

describe('getAppElements', () => {
  it('finds layout elements by simple ID', () => {
    const result = getAppElements(appSpec, ['sidebar']);
    expect(result.found.sidebar).toBeDefined();
    expect((result.found.sidebar as Record<string, unknown>).type).toBe('box');
    expect(result.notFound).toEqual([]);
  });

  it('finds top-level section via dot-notation: tokens.colors', () => {
    const result = getAppElements(appSpec, ['tokens.colors']);
    expect(result.found['tokens.colors']).toEqual({ primary: '#0D9488', surface: '#FFF' });
  });

  it('finds deep dot-notation: tokens.components.button.primary', () => {
    const result = getAppElements(appSpec, ['tokens.components.button.primary']);
    expect(result.found['tokens.components.button.primary']).toEqual({ style: { bg: 'blue' } });
  });

  it('finds screen definition: screens.home', () => {
    const result = getAppElements(appSpec, ['screens.home']);
    expect(result.found['screens.home']).toEqual({ label: 'Home', icon: 'house' });
  });

  it('finds navigation section: navigation.auth', () => {
    const result = getAppElements(appSpec, ['navigation.auth']);
    expect(result.found['navigation.auth']).toBeDefined();
  });

  it('finds translations: translations.en', () => {
    const result = getAppElements(appSpec, ['translations.en']);
    expect(result.found['translations.en']).toEqual({ 'app.title': 'Test' });
  });

  it('mixes simple IDs and dot-notation', () => {
    const result = getAppElements(appSpec, ['sidebar', 'tokens.colors', 'screens.home']);
    expect(Object.keys(result.found)).toHaveLength(3);
    expect(result.notFound).toEqual([]);
  });

  it('reports notFound for non-existent IDs and dot-paths', () => {
    const result = getAppElements(appSpec, ['nonexistent', 'tokens.missing.deep']);
    expect(result.notFound).toEqual(['nonexistent', 'tokens.missing.deep']);
  });
});
