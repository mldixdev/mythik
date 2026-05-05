import { describe, it, expect, vi } from 'vitest';
import { createStateStore } from '../../src/state/store.js';
import { createAppEngine } from '../../src/app/app-engine.js';
import type { AppSpec, ScreenDefinition } from '../../src/app/app-engine.js';
import type { Spec } from '../../src/types.js';
import type { SpecStore } from '../../src/spec-engine/types.js';

/**
 * AppEngine — multi-screen app composition.
 *
 * C.2: AppSpec type, screen loading, state namespacing, token/template inheritance.
 * C.3: State policies (preserve/reset/reload), breadcrumb (history/hierarchy).
 */

function createMockSpecStore(specs: Record<string, Spec>): SpecStore {
  return {
    load: vi.fn(async (id: string) => {
      if (!specs[id]) throw new Error(`Spec "${id}" not found`);
      return specs[id];
    }),
    save: vi.fn(async () => {}),
    list: vi.fn(async () => Object.keys(specs)),
  };
}

const taskManagerSpec: Spec = {
  root: 'task-root',
  elements: {
    'task-root': { type: 'stack', children: ['task-title'] },
    'task-title': { type: 'text', props: { content: 'Tasks' } },
  },
};

const dashboardSpec: Spec = {
  root: 'dash-root',
  elements: {
    'dash-root': { type: 'stack', children: ['dash-title'] },
    'dash-title': { type: 'text', props: { content: 'Dashboard' } },
  },
  initialActions: [{ action: 'setState', params: { statePath: '/dashLoaded', value: true } }],
};

const newTaskSpec: Spec = {
  root: 'form-root',
  elements: {
    'form-root': { type: 'stack', children: ['form-title'] },
    'form-title': { type: 'text', props: { content: 'New Task' } },
  },
};

function createBaseAppSpec(overrides: Partial<AppSpec> = {}): AppSpec {
  return {
    type: 'app',
    name: 'test-app',
    navigation: {
      type: 'sidebar',
      initialScreen: 'task-manager',
      breadcrumb: 'history',
    },
    screens: {
      'task-manager': {
        label: 'Task Manager',
        icon: 'clipboard-text',
        roles: ['admin', 'user'],
        statePolicy: 'preserve',
      },
      dashboard: {
        label: 'Dashboard',
        icon: 'chart-bar',
        roles: ['admin', 'user', 'viewer'],
        statePolicy: 'reload',
      },
      'new-task': {
        label: 'New Task',
        icon: 'plus',
        roles: ['admin', 'user'],
        statePolicy: 'reset',
        parent: 'task-manager',
      },
    },
    sharedState: {
      user: { role: 'admin', name: 'Alice' },
      preferences: { theme: 'light', locale: 'en' },
    },
    tokens: {
      colors: { primary: '#0D9488' },
    },
    templates: {
      'app-card': {
        type: 'box',
        defaults: { padding: 16 },
        style: { padding: { $prop: 'padding' } },
      },
    },
    layout: {
      root: 'app-shell',
      elements: {
        'app-shell': { type: 'stack', children: ['screen-outlet'] },
        'screen-outlet': { type: 'screen-outlet' },
      },
    },
    ...overrides,
  };
}

describe('AppEngine', () => {
  // ─── Initialization ───

  describe('mount', () => {
    it('initializes shared state on mount', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const appSpec = createBaseAppSpec();

      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      expect(store.get('/user/role')).toBe('admin');
      expect(store.get('/user/name')).toBe('Alice');
      expect(store.get('/preferences/theme')).toBe('light');
    });

    it('sets initial screen in navigation state', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const appSpec = createBaseAppSpec();

      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/navigation/history')).toEqual(['task-manager']);
    });

    it('populates /app/screens with screen definitions', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const appSpec = createBaseAppSpec();

      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      const screens = store.get('/app/screens') as Array<ScreenDefinition & { id: string }>;
      expect(screens).toHaveLength(3);
      expect(screens[0].id).toBe('task-manager');
      expect(screens[0].label).toBe('Task Manager');
      expect(screens[0].icon).toBe('clipboard-text');
    });

    it('sets /app/name', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const appSpec = createBaseAppSpec();

      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      expect(store.get('/app/name')).toBe('test-app');
    });
  });

  // ─── Navigation ───

  describe('navigation', () => {
    it('navigates to a new screen and updates state', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        dashboard: dashboardSpec,
      });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      await engine.navigate('dashboard');

      expect(store.get('/navigation/currentScreen')).toBe('dashboard');
      expect(store.get('/navigation/history')).toEqual(['task-manager', 'dashboard']);
    });

    it('goBack returns to previous screen', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        dashboard: dashboardSpec,
      });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      await engine.navigate('dashboard');
      engine.goBack();

      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/navigation/history')).toEqual(['task-manager']);
    });

    it('throws on navigation to unknown screen', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      await expect(engine.navigate('nonexistent')).rejects.toThrow('Unknown screen: "nonexistent"');
    });
  });

  // ─── Screen Spec Loading ───

  describe('screen spec loading', () => {
    it('loads the current screen spec from SpecStore', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      const spec = await engine.getScreenSpec('task-manager');
      expect(spec.root).toBe('task-root');
    });

    it('caches loaded specs (does not re-fetch)', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      await engine.getScreenSpec('task-manager');
      await engine.getScreenSpec('task-manager');

      expect(specStore.load).toHaveBeenCalledTimes(1);
    });

    it('merges app-level templates into screen spec', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const appSpec = createBaseAppSpec();
      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      const spec = await engine.getScreenSpec('task-manager');
      expect(spec.templates?.['app-card']).toBeDefined();
      expect(spec.templates?.['app-card'].type).toBe('box');
    });

    it('screen templates override app templates with same name', async () => {
      const screenWithTemplate: Spec = {
        root: 'root',
        elements: { root: { type: 'text', props: {} } },
        templates: {
          'app-card': {
            type: 'text',
            props: { content: 'screen-override' },
          },
        },
      };
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': screenWithTemplate });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      const spec = await engine.getScreenSpec('task-manager');
      expect(spec.templates?.['app-card'].type).toBe('text');
    });
  });

  // ─── State Namespacing ───

  describe('state namespacing', () => {
    it('screen state is isolated under /screens/{id}/', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        dashboard: dashboardSpec,
      });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      // Simulate screen-local state
      store.set('/screens/task-manager/filter', { status: 'active' });
      store.set('/screens/dashboard/view', 'chart');

      expect(store.get('/screens/task-manager/filter')).toEqual({ status: 'active' });
      expect(store.get('/screens/dashboard/view')).toBe('chart');
    });
  });

  // ─── State Policies (C.3) ───

  describe('state policies', () => {
    it('preserve: keeps screen state when navigating away and back', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        dashboard: dashboardSpec,
      });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      // Set screen-local state for task-manager (preserve policy)
      store.set('/screens/task-manager/scrollPos', 100);

      await engine.navigate('dashboard');

      // State should still be there
      expect(store.get('/screens/task-manager/scrollPos')).toBe(100);

      engine.goBack();

      // State preserved after returning
      expect(store.get('/screens/task-manager/scrollPos')).toBe(100);
    });

    it('reset: clears screen state when navigating to it', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        'new-task': newTaskSpec,
      });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      // Set some state in new-task's namespace
      store.set('/screens/new-task/form', { title: 'draft' });

      await engine.navigate('new-task');

      // State should be cleared (reset policy)
      expect(store.get('/screens/new-task/form')).toBeUndefined();
    });

    it('reload: clears screen state and marks for re-execution', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        dashboard: dashboardSpec,
      });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      // Dashboard has statePolicy: 'reload'
      store.set('/screens/dashboard/cachedData', [1, 2, 3]);

      await engine.navigate('dashboard');

      // State should be cleared
      expect(store.get('/screens/dashboard/cachedData')).toBeUndefined();
      // Engine should signal that initialActions need re-execution
      expect(store.get('/screens/dashboard/_reload')).toBe(true);
    });
  });

  // ─── Breadcrumb (C.3) ───

  describe('breadcrumb', () => {
    it('history mode: breadcrumb follows navigation stack', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        dashboard: dashboardSpec,
      });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      const bc1 = store.get('/navigation/breadcrumb') as Array<{ id: string; label: string }>;
      expect(bc1).toEqual([
        { id: 'task-manager', label: 'Task Manager', icon: 'clipboard-text' },
      ]);

      await engine.navigate('dashboard');

      const bc2 = store.get('/navigation/breadcrumb') as Array<{ id: string; label: string }>;
      expect(bc2).toEqual([
        { id: 'task-manager', label: 'Task Manager', icon: 'clipboard-text' },
        { id: 'dashboard', label: 'Dashboard', icon: 'chart-bar' },
      ]);
    });

    it('hierarchy mode: breadcrumb follows parent chain', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        'new-task': newTaskSpec,
      });
      const appSpec = createBaseAppSpec({
        navigation: {
          type: 'sidebar',
          initialScreen: 'task-manager',
          breadcrumb: 'hierarchy',
        },
      });
      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      await engine.navigate('new-task');

      const bc = store.get('/navigation/breadcrumb') as Array<{ id: string; label: string }>;
      // new-task's parent is task-manager
      expect(bc).toEqual([
        { id: 'task-manager', label: 'Task Manager', icon: 'clipboard-text' },
        { id: 'new-task', label: 'New Task', icon: 'plus' },
      ]);
    });

    it('breadcrumb "none" mode skips auto-computation', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const appSpec = createBaseAppSpec({
        navigation: {
          type: 'sidebar',
          initialScreen: 'task-manager',
          breadcrumb: 'none',
        },
      });
      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      expect(store.get('/navigation/breadcrumb')).toBeUndefined();
    });
  });

  // ─── Role-based access ───

  describe('role-based access', () => {
    it('canAccess checks role against screen roles', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();

      expect(engine.canAccess('task-manager', 'admin')).toBe(true);
      expect(engine.canAccess('task-manager', 'viewer')).toBe(false);
      expect(engine.canAccess('dashboard', 'viewer')).toBe(true);
    });
  });

  // ─── Auth ───

  describe('auth', () => {
    it('redirects to login screen when unauthenticated and screen is protected', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        login: { root: 'r', elements: { r: { type: 'text', props: {} } } },
      });
      const appSpec = createBaseAppSpec({
        navigation: {
          type: 'sidebar',
          initialScreen: 'task-manager',
          breadcrumb: 'history',
          auth: {
            loginScreen: 'login',
            protectedScreens: ['*'],
            roleAccess: {
              admin: ['*'],
              user: ['task-manager'],
            },
          },
        },
      });
      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      // User has no role set
      store.set('/user/role', '');

      await engine.navigate('task-manager');

      // Should redirect to login
      expect(store.get('/navigation/currentScreen')).toBe('login');
    });
  });

  // ─── Unmount ───

  describe('unmount', () => {
    it('cleans up without errors', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec });
      const engine = createAppEngine({ appSpec: createBaseAppSpec(), store, specStore });
      engine.mount();
      expect(() => engine.unmount()).not.toThrow();
    });
  });

  // ─── roleAccess unification ───

  describe('roleAccess unification', () => {
    const loginSpec: Spec = {
      root: 'login-root',
      elements: { 'login-root': { type: 'text', props: { content: 'Login' } } },
    };

    function createAuthAppSpec(roleAccess?: Record<string, string[]>): AppSpec {
      return createBaseAppSpec({
        screens: {
          'task-manager': { label: 'Task Manager', icon: 'clipboard-text', roles: ['admin', 'user'] },
          dashboard: { label: 'Dashboard', icon: 'chart-bar', roles: ['admin', 'user', 'viewer'] },
          'admin-panel': { label: 'Admin Panel', icon: 'gear', roles: ['admin'] },
          login: { label: 'Login', icon: 'sign-in' },
        },
        navigation: {
          type: 'sidebar',
          initialScreen: 'task-manager',
          breadcrumb: 'history',
          auth: {
            loginScreen: 'login',
            protectedScreens: ['*'],
            roleAccess: roleAccess ?? { admin: ['*'], user: ['task-manager', 'dashboard'], viewer: ['dashboard'] },
          },
        },
      });
    }

    it('roleAccess defined + role listed → access granted', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, login: loginSpec });
      const engine = createAppEngine({ appSpec: createAuthAppSpec(), store, specStore });
      engine.mount();

      expect(engine.canAccess('task-manager', 'admin')).toBe(true);
      expect(engine.canAccess('task-manager', 'user')).toBe(true);
      expect(engine.canAccess('dashboard', 'viewer')).toBe(true);
    });

    it('roleAccess defined + role NOT listed → access denied', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, login: loginSpec });
      const engine = createAppEngine({ appSpec: createAuthAppSpec(), store, specStore });
      engine.mount();

      expect(engine.canAccess('task-manager', 'viewer')).toBe(false);
      expect(engine.canAccess('admin-panel', 'user')).toBe(false);
      expect(engine.canAccess('admin-panel', 'unknown-role')).toBe(false);
    });

    it('roleAccess defined + wildcard ["*"] → access granted to all screens', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, login: loginSpec });
      const engine = createAppEngine({ appSpec: createAuthAppSpec(), store, specStore });
      engine.mount();

      expect(engine.canAccess('task-manager', 'admin')).toBe(true);
      expect(engine.canAccess('admin-panel', 'admin')).toBe(true);
      expect(engine.canAccess('dashboard', 'admin')).toBe(true);
    });

    it('no roleAccess → falls back to ScreenDefinition.roles', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, login: loginSpec });
      const appSpec = createBaseAppSpec({
        navigation: {
          type: 'sidebar',
          initialScreen: 'task-manager',
          breadcrumb: 'history',
          auth: {
            loginScreen: 'login',
            protectedScreens: ['*'],
            roleAccess: undefined as unknown as Record<string, string[]>,
          },
        },
      });
      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      expect(engine.canAccess('task-manager', 'admin')).toBe(true);
      expect(engine.canAccess('task-manager', 'viewer')).toBe(false);
      expect(engine.canAccess('dashboard', 'viewer')).toBe(true);
    });

    it('loginScreen always exempt from protectedScreens ["*"]', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, login: loginSpec });
      const engine = createAppEngine({ appSpec: createAuthAppSpec(), store, specStore });
      engine.mount();

      await engine.navigate('login');

      expect(store.get('/navigation/currentScreen')).toBe('login');
    });

    it('authenticated without access → no redirect, sets /auth/error', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        'admin-panel': { root: 'r', elements: { r: { type: 'text', props: {} } } },
        login: loginSpec,
      });
      const engine = createAppEngine({ appSpec: createAuthAppSpec(), store, specStore });

      // Set auth state BEFORE mount so initialScreen resolves to task-manager (not login)
      store.set('/auth/isAuthenticated', true);
      store.set('/auth/user/role', 'viewer');
      engine.mount();

      await engine.navigate('admin-panel');

      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/auth/error')).toBe('Access denied: screen "admin-panel"');
    });

    it('unauthenticated → redirect to loginScreen', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, login: loginSpec });
      const engine = createAppEngine({ appSpec: createAuthAppSpec(), store, specStore });
      engine.mount();

      // Clear legacy role set by sharedState to simulate unauthenticated user
      store.set('/user/role', undefined);
      store.set('/auth/user/role', undefined);

      await engine.navigate('dashboard');

      expect(store.get('/navigation/currentScreen')).toBe('login');
    });

    it('sidebar filters screens by user access', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, login: loginSpec });
      const engine = createAppEngine({ appSpec: createAuthAppSpec(), store, specStore });

      store.set('/auth/user/role', 'viewer');
      engine.mount();

      const screens = store.get('/app/screens') as Array<{ id: string }>;
      const ids = screens.map((s) => s.id);

      expect(ids).toContain('dashboard');
      expect(ids).not.toContain('task-manager');
      expect(ids).not.toContain('admin-panel');
      expect(ids).not.toContain('login');
    });

    it('refreshScreenList re-computes sidebar after login', () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, login: loginSpec });
      const engine = createAppEngine({ appSpec: createAuthAppSpec(), store, specStore });

      engine.mount();

      const screensBefore = store.get('/app/screens') as Array<{ id: string }>;
      const idsBefore = screensBefore.map((s) => s.id);
      expect(idsBefore.length).toBeGreaterThanOrEqual(3);

      store.set('/auth/user/role', 'viewer');
      engine.refreshScreenList();

      const screensAfter = store.get('/app/screens') as Array<{ id: string }>;
      const idsAfter = screensAfter.map((s) => s.id);
      expect(idsAfter).toContain('dashboard');
      expect(idsAfter).not.toContain('task-manager');
      expect(idsAfter).not.toContain('admin-panel');
    });

    it('multi-role user: any matching role grants access', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({
        'task-manager': taskManagerSpec,
        'admin-panel': { root: 'r', elements: { r: { type: 'text', props: {} } } },
        login: loginSpec,
      });
      const engine = createAppEngine({ appSpec: createAuthAppSpec(), store, specStore });

      // Set auth state BEFORE mount so initialScreen resolves correctly
      store.set('/auth/isAuthenticated', true);
      store.set('/auth/user/roles', ['viewer', 'user']);
      engine.mount();

      await engine.navigate('task-manager');
      expect(store.get('/navigation/currentScreen')).toBe('task-manager');

      await engine.navigate('admin-panel');
      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/auth/error')).toBe('Access denied: screen "admin-panel"');
    });
  });

  describe('editor session dirty guard', () => {
    function createGuardedAppSpec(): AppSpec {
      return createBaseAppSpec({
        navigation: {
          type: 'sidebar',
          initialScreen: 'task-manager',
          breadcrumb: 'history',
          editorSessionGuard: {
            enabled: true,
            sessions: ['floor-layout'],
          },
        },
      });
    }

    function markDirty(store: ReturnType<typeof createStateStore>): void {
      store.set('/ui/editorSessions/floor-layout', {
        id: 'floor-layout',
        label: 'Floor layout',
        dirty: true,
        status: 'dirty',
        saveStatus: 'idle',
        saveError: null,
        lastSavedAt: '2026-05-04T00:00:00.000Z',
      });
    }

    it('blocks navigate and writes pending state when a guarded session is dirty', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const engine = createAppEngine({ appSpec: createGuardedAppSpec(), store, specStore });
      engine.mount();
      markDirty(store);

      await engine.navigate('dashboard');

      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/ui/navigationGuard/pending')).toMatchObject({
        kind: 'editor-session-dirty',
        action: 'navigateScreen',
        screen: 'dashboard',
        dirtySessions: [{ id: 'floor-layout', label: 'Floor layout' }],
      });
    });

    it('keeps pending navigation when navigationGuardProceed is called while the session is still dirty', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const engine = createAppEngine({ appSpec: createGuardedAppSpec(), store, specStore });
      engine.mount();
      markDirty(store);

      await engine.navigate('dashboard');
      await engine.navigationGuardProceed();

      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/ui/navigationGuard/pending')).toMatchObject({ action: 'navigateScreen' });
      expect(store.get('/ui/navigationGuard/error')).toMatchObject({
        message: expect.stringContaining('still dirty'),
      });
    });

    it('proceeds with pending navigation after the session becomes clean', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const engine = createAppEngine({ appSpec: createGuardedAppSpec(), store, specStore });
      engine.mount();
      markDirty(store);

      await engine.navigate('dashboard');
      store.set('/ui/editorSessions/floor-layout/dirty', false);
      await engine.navigationGuardProceed();

      expect(store.get('/navigation/currentScreen')).toBe('dashboard');
      expect(store.get('/ui/navigationGuard/pending')).toBeUndefined();
      expect(store.get('/ui/navigationGuard/error')).toBeUndefined();
    });

    it('cancels pending navigation without changing screen', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const engine = createAppEngine({ appSpec: createGuardedAppSpec(), store, specStore });
      engine.mount();
      markDirty(store);

      await engine.navigate('dashboard');
      engine.navigationGuardCancel();

      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/ui/navigationGuard/pending')).toBeUndefined();
    });

    it('blocks goBack and resumes it through navigationGuardProceed after the session becomes clean', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const engine = createAppEngine({ appSpec: createGuardedAppSpec(), store, specStore });
      engine.mount();

      await engine.navigate('dashboard');
      markDirty(store);
      engine.goBack();

      expect(store.get('/navigation/currentScreen')).toBe('dashboard');
      expect(store.get('/ui/navigationGuard/pending')).toMatchObject({ action: 'goBackScreen' });

      store.set('/ui/editorSessions/floor-layout/dirty', false);
      await engine.navigationGuardProceed();

      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/ui/navigationGuard/pending')).toBeUndefined();
    });

    it('discards dirty sessions before proceeding when navigationGuardDiscardAndProceed is called', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const engine = createAppEngine({ appSpec: createGuardedAppSpec(), store, specStore });
      const editorEngine = { discard: vi.fn() };
      engine.mount();
      engine.attachEditorSessionEngine(editorEngine as never);
      markDirty(store);

      await engine.navigate('dashboard');
      await engine.navigationGuardDiscardAndProceed();

      expect(editorEngine.discard).toHaveBeenCalledWith('floor-layout');
      expect(store.get('/navigation/currentScreen')).toBe('dashboard');
      expect(store.get('/ui/navigationGuard/pending')).toBeUndefined();
    });

    it('saves dirty sessions before proceeding when navigationGuardSaveAndProceed is called', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const engine = createAppEngine({ appSpec: createGuardedAppSpec(), store, specStore });
      const editorEngine = {
        save: vi.fn(async ({ session }: { session: string }) => {
          store.set(`/ui/editorSessions/${session}/dirty`, false);
          store.set(`/ui/editorSessions/${session}/saveStatus`, 'saved');
          return store.get(`/ui/editorSessions/${session}`);
        }),
      };
      engine.mount();
      engine.attachEditorSessionEngine(editorEngine as never);
      markDirty(store);

      await engine.navigate('dashboard');
      await engine.navigationGuardSaveAndProceed();

      expect(editorEngine.save).toHaveBeenCalledWith({ session: 'floor-layout' });
      expect(store.get('/navigation/currentScreen')).toBe('dashboard');
      expect(store.get('/ui/navigationGuard/pending')).toBeUndefined();
      expect(store.get('/ui/navigationGuard/error')).toBeUndefined();
    });

    it('keeps pending navigation and writes an error when save cannot clean the session', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const engine = createAppEngine({ appSpec: createGuardedAppSpec(), store, specStore });
      const editorEngine = {
        save: vi.fn(async ({ session }: { session: string }) => {
          store.set(`/ui/editorSessions/${session}/saveStatus`, 'error');
          return store.get(`/ui/editorSessions/${session}`);
        }),
      };
      engine.mount();
      engine.attachEditorSessionEngine(editorEngine as never);
      markDirty(store);

      await engine.navigate('dashboard');
      await engine.navigationGuardSaveAndProceed();

      expect(editorEngine.save).toHaveBeenCalledWith({ session: 'floor-layout' });
      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/ui/navigationGuard/pending')).toMatchObject({ action: 'navigateScreen' });
      expect(store.get('/ui/navigationGuard/error')).toMatchObject({
        message: expect.stringContaining('still dirty'),
      });
    });

    it('keeps pending navigation and writes an error when discard cannot run', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const engine = createAppEngine({ appSpec: createGuardedAppSpec(), store, specStore });
      engine.mount();
      markDirty(store);

      await engine.navigate('dashboard');
      await engine.navigationGuardDiscardAndProceed();

      expect(store.get('/navigation/currentScreen')).toBe('task-manager');
      expect(store.get('/ui/navigationGuard/pending')).toMatchObject({ action: 'navigateScreen' });
      expect(store.get('/ui/navigationGuard/error')).toMatchObject({
        message: expect.stringContaining('editor session engine'),
      });
    });

    it('ignores guarded sessions that are not mounted yet', async () => {
      const store = createStateStore({});
      const specStore = createMockSpecStore({ 'task-manager': taskManagerSpec, dashboard: dashboardSpec });
      const appSpec = createBaseAppSpec({
        navigation: {
          type: 'sidebar',
          initialScreen: 'task-manager',
          editorSessionGuard: { enabled: true, sessions: ['not-mounted-yet'] },
        },
      });
      const engine = createAppEngine({ appSpec, store, specStore });
      engine.mount();

      await engine.navigate('dashboard');

      expect(store.get('/navigation/currentScreen')).toBe('dashboard');
      expect(store.get('/ui/navigationGuard/pending')).toBeUndefined();
    });
  });
});
