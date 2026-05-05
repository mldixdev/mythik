import { describe, it, expect } from 'vitest';
import { validateAppSpec } from '../../src/security/app-spec-validator.js';
import { validateSpec } from '../../src/security/spec-validator.js';
import { COLOR_SCHEMES } from '../../src/design/identity/types.js';
import type { AppSpec } from '../../src/app/app-engine.js';

function makeApp(overrides: Partial<AppSpec> = {}): AppSpec {
  return {
    type: 'app',
    navigation: { type: 'sidebar', initialScreen: 'home' },
    screens: { home: { label: 'Home' } },
    layout: { root: 'page', elements: { page: { type: 'box', props: {} } } },
    ...overrides,
  };
}

describe('validateAppSpec', () => {
  it('valid AppSpec passes clean', () => {
    const result = validateAppSpec(makeApp());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('layout validation reuses validateSpec — orphan children detected', () => {
    const app = makeApp({
      layout: { root: 'page', elements: { page: { type: 'box', props: {}, children: ['ghost'] } } },
    });
    const result = validateAppSpec(app);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('ghost'))).toBe(true);
  });

  it('layout error paths are prefixed with /layout', () => {
    const app = makeApp({
      layout: { root: 'page', elements: { page: { type: 'box', props: {}, children: ['ghost'] } } },
    });
    const result = validateAppSpec(app);
    const orphanError = result.errors.find(e => e.message.includes('ghost'));
    expect(orphanError?.path).toMatch(/^\/layout\//);
  });

  it('initialScreen must exist in screens', () => {
    const app = makeApp({ navigation: { type: 'sidebar', initialScreen: 'nonexistent' } });
    const result = validateAppSpec(app);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('initialScreen') && e.message.includes('nonexistent'))).toBe(true);
  });

  it('loginScreen must exist in screens', () => {
    const app = makeApp({
      navigation: { type: 'sidebar', initialScreen: 'home', auth: { loginScreen: 'nope', protectedScreens: ['*'], roleAccess: {} } },
    });
    const result = validateAppSpec(app);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('loginScreen') && e.message.includes('nope'))).toBe(true);
  });

  it('menu items must exist in screens — with suggested fix', () => {
    const app = makeApp({
      navigation: { type: 'sidebar', initialScreen: 'home', menu: ['home', 'hme'] },
    });
    const result = validateAppSpec(app);
    expect(result.valid).toBe(false);
    const menuError = result.errors.find(e => e.message.includes('menu') && e.message.includes('hme'));
    expect(menuError).toBeDefined();
    expect(menuError?.suggestedFixes?.[0]?.patch.value).toBe('home');
  });

  it('roleAccess screen references must exist — with suggested fix', () => {
    const app = makeApp({
      screens: { home: { label: 'Home' }, settings: { label: 'Settings' } },
      navigation: {
        type: 'sidebar', initialScreen: 'home',
        auth: { loginScreen: 'home', protectedScreens: ['*'], roleAccess: { admin: ['*'], viewer: ['settigns'] } },
      },
    });
    const result = validateAppSpec(app);
    expect(result.valid).toBe(false);
    const raError = result.errors.find(e => e.message.includes('roleAccess') && e.message.includes('settigns'));
    expect(raError?.suggestedFixes?.[0]?.patch.value).toBe('settings');
  });

  it('protectedScreens items must exist (except *)', () => {
    const app = makeApp({
      navigation: {
        type: 'sidebar', initialScreen: 'home',
        auth: { loginScreen: 'home', protectedScreens: ['home', 'missing'], roleAccess: {} },
      },
    });
    const result = validateAppSpec(app);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('protectedScreens') && e.message.includes('missing'))).toBe(true);
  });

  it('translation key mismatch is a warning (valid remains true)', () => {
    const app = makeApp({
      translations: {
        en: { 'a': '1', 'b': '2', 'c': '3' },
        es: { 'a': '1' },
      },
    });
    const result = validateAppSpec(app);
    expect(result.valid).toBe(true);
    expect(result.errors.some(e => e.message.includes('missing') && e.message.includes('es'))).toBe(true);
  });

  it('layout root must exist in layout.elements', () => {
    const app = makeApp({
      layout: { root: 'missing', elements: { page: { type: 'box', props: {} } } },
    });
    const result = validateAppSpec(app);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes('missing'))).toBe(true);
  });

  it('roleAccess wildcard * is valid', () => {
    const app = makeApp({
      navigation: {
        type: 'sidebar', initialScreen: 'home',
        auth: { loginScreen: 'home', protectedScreens: ['*'], roleAccess: { admin: ['*'] } },
      },
    });
    const result = validateAppSpec(app);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid AppSpec tokens.identity enum values with allowed values', () => {
    const app = makeApp({
      tokens: {
        identity: { colorScheme: 'light' },
      },
    });

    const result = validateAppSpec(app);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e =>
      e.path === '/tokens/identity/colorScheme'
      && e.message.includes(COLOR_SCHEMES.join(', '))
    )).toBe(true);
  });

  it('accepts valid AppSpec tokens.identity nested values', () => {
    const app = makeApp({
      tokens: {
        identity: {
          surface: 'outlined',
          radiusPattern: 'diagonal',
          typographyHierarchy: 'editorial',
          colorScheme: 'light-surface',
          colorWeight: 'branded-nav',
          accentApplication: { cardLine: ['top', 'left'], buttons: true },
          coloredSurfaceLayers: { background: 10, surface: 30, primitive: 50 },
          gradients: { buttons: 'soft', text: true, cards: false },
          icons: { weight: 'bold', container: 'rounded-square', containerColor: 'accent' },
          images: { corners: 'circle', overlay: 'none', border: true },
        },
      },
    });

    const result = validateAppSpec(app);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid nested AppSpec tokens.identity values', () => {
    const app = makeApp({
      tokens: {
        identity: {
          depth: 2,
          accentApplication: { cardLine: ['center'] },
          coloredSurfaceLayers: { background: -1, surface: 30, primitive: 101 },
          icons: { container: 'rounded' },
          images: { overlay: 'blur' },
        },
      },
    });

    const result = validateAppSpec(app);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.path === '/tokens/identity/depth')).toBe(true);
    expect(result.errors.some(e => e.path === '/tokens/identity/accentApplication/cardLine/0')).toBe(true);
    expect(result.errors.some(e => e.path === '/tokens/identity/coloredSurfaceLayers/background')).toBe(true);
    expect(result.errors.some(e => e.path === '/tokens/identity/coloredSurfaceLayers/primitive')).toBe(true);
    expect(result.errors.some(e => e.path === '/tokens/identity/icons/container')).toBe(true);
    expect(result.errors.some(e => e.path === '/tokens/identity/images/overlay')).toBe(true);
  });

  it('rejects invalid screen Spec tokens.identity values', () => {
    const result = validateSpec({
      root: 'page',
      elements: { page: { type: 'box', props: {} } },
      tokens: { identity: { colorWeight: 'navy' } },
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e =>
      e.path === '/tokens/identity/colorWeight'
      && e.message.includes('branded-nav')
    )).toBe(true);
  });

  it('accepts valid navigation.editorSessionGuard config', () => {
    const app = makeApp({
      navigation: {
        type: 'sidebar',
        initialScreen: 'home',
        editorSessionGuard: {
          enabled: true,
          sessions: ['floor-layout'],
          blockNavigation: true,
          blockGoBack: true,
          blockBrowserUnload: true,
          pendingPath: '/ui/navigationGuard/pending',
        },
      },
    });

    expect(validateAppSpec(app).valid).toBe(true);
  });

  it('rejects invalid navigation.editorSessionGuard fields', () => {
    const app = makeApp({
      navigation: {
        type: 'sidebar',
        initialScreen: 'home',
        editorSessionGuard: {
          enabled: 'yes',
          sessions: ['floor-layout', 7],
          blockNavigation: 'yes',
          blockGoBack: 'yes',
          blockBrowserUnload: 'no',
          pendingPath: '/layout/pending',
        } as never,
      },
    });

    const result = validateAppSpec(app);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === '/navigation/editorSessionGuard/enabled')).toBe(true);
    expect(result.errors.some((e) => e.path === '/navigation/editorSessionGuard/sessions/1')).toBe(true);
    expect(result.errors.some((e) => e.path === '/navigation/editorSessionGuard/blockNavigation')).toBe(true);
    expect(result.errors.some((e) => e.path === '/navigation/editorSessionGuard/blockGoBack')).toBe(true);
    expect(result.errors.some((e) => e.path === '/navigation/editorSessionGuard/blockBrowserUnload')).toBe(true);
    expect(result.errors.some((e) => e.path === '/navigation/editorSessionGuard/pendingPath')).toBe(true);
  });

  it('rejects pendingPath that collides with framework-reserved paths', () => {
    const app = makeApp({
      navigation: {
        type: 'sidebar',
        initialScreen: 'home',
        editorSessionGuard: {
          enabled: true,
          pendingPath: '/ui/editorSessions/floor-layout',
        },
      },
    });

    const result = validateAppSpec(app);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) =>
      e.path === '/navigation/editorSessionGuard/pendingPath'
      && e.message.includes('reserved')
    )).toBe(true);
  });

  it('rejects pendingPath without a concrete /ui child segment', () => {
    const app = makeApp({
      navigation: {
        type: 'sidebar',
        initialScreen: 'home',
        editorSessionGuard: {
          enabled: true,
          pendingPath: '/ui',
        },
      },
    });

    const result = validateAppSpec(app);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === '/navigation/editorSessionGuard/pendingPath')).toBe(true);
  });
});
