import { describe, it, expect, vi } from 'vitest';
import type { SqlDriver } from 'mythik/server';
import { checkScreensTable, buildSpecServingRoutes, discoverAppSpecs, stripSensitiveFields } from '../src/spec-serving.js';

function mockDriver(options: {
  tableExists?: boolean;
  tableExistsError?: Error;
  queryRows?: Record<string, unknown>[];
} = {}): SqlDriver {
  return {
    tableExists: options.tableExistsError
      ? vi.fn().mockRejectedValue(options.tableExistsError)
      : vi.fn().mockResolvedValue(options.tableExists ?? true),
    query: vi.fn().mockResolvedValue(options.queryRows ?? []),
    quoteIdent: (identifier: string) => `"${identifier}"`,
  } as unknown as SqlDriver;
}

describe('checkScreensTable', () => {
  it('returns true when table exists', async () => {
    const driver = mockDriver({ tableExists: true });
    const exists = await checkScreensTable(driver, 'screens');
    expect(exists).toBe(true);
    expect(driver.tableExists).toHaveBeenCalledWith('screens');
  });

  it('returns false when table does not exist', async () => {
    const driver = mockDriver({ tableExists: false });
    const exists = await checkScreensTable(driver, 'screens');
    expect(exists).toBe(false);
  });

  it('returns false on query error (graceful)', async () => {
    const driver = mockDriver({ tableExistsError: new Error('connection lost') });
    const exists = await checkScreensTable(driver, 'screens');
    expect(exists).toBe(false);
  });
});

describe('buildSpecServingRoutes', () => {
  it('loadScreen returns parsed spec', async () => {
    const specData = { root: 'page', elements: { page: { type: 'box' } } };
    const driver = mockDriver({ queryRows: [{ spec: JSON.stringify(specData) }] });
    const routes = buildSpecServingRoutes(driver, 'screens');
    const result = await routes.loadScreen('task-manager');
    expect(result).toEqual(specData);
    expect(driver.query).toHaveBeenCalledWith(
      'SELECT "spec" FROM "screens" WHERE "id" = @id',
      { id: 'task-manager' },
    );
  });

  it('loadScreen returns null for missing screen', async () => {
    const driver = mockDriver({ queryRows: [] });
    const routes = buildSpecServingRoutes(driver, 'screens');
    const result = await routes.loadScreen('nonexistent');
    expect(result).toBeNull();
  });

  it('loadApp returns spec only if type is app', async () => {
    const appSpec = { type: 'app', name: 'my-app' };
    const driver = mockDriver({ queryRows: [{ spec: JSON.stringify(appSpec) }] });
    const routes = buildSpecServingRoutes(driver, 'screens');
    const result = await routes.loadApp('app-demo');
    expect(result).toEqual(appSpec);
  });

  it('loadApp returns null for non-app spec', async () => {
    const screenSpec = { root: 'page', elements: {} };
    const driver = mockDriver({ queryRows: [{ spec: JSON.stringify(screenSpec) }] });
    const routes = buildSpecServingRoutes(driver, 'screens');
    const result = await routes.loadApp('task-manager');
    expect(result).toBeNull();
  });

  it('loadScreen returns null for type: "api" specs (never served to browser)', async () => {
    const apiSpec = { type: 'api', endpoints: {} };
    const driver = mockDriver({ queryRows: [{ spec: JSON.stringify(apiSpec) }] });
    const routes = buildSpecServingRoutes(driver, 'screens');
    const result = await routes.loadScreen('my-api');
    expect(result).toBeNull();
  });

  it('loadApp returns null for type: "api" specs', async () => {
    const apiSpec = { type: 'api', endpoints: {} };
    const driver = mockDriver({ queryRows: [{ spec: JSON.stringify(apiSpec) }] });
    const routes = buildSpecServingRoutes(driver, 'screens');
    const result = await routes.loadApp('my-api');
    expect(result).toBeNull();
  });
});

describe('discoverAppSpecs', () => {
  it('discovers app specs and login screens through the driver', async () => {
    const appSpec = { type: 'app', navigation: { auth: { loginScreen: 'login' } } };
    const driver = mockDriver({
      queryRows: [
        { id: 'main-app', spec: JSON.stringify(appSpec) },
        { id: 'api-spec', spec: JSON.stringify({ type: 'api' }) },
        { id: 'plain-screen', spec: JSON.stringify({ root: 'page' }) },
      ],
    });

    const apps = await discoverAppSpecs(driver, 'screens');

    expect(apps).toEqual([{ id: 'main-app', loginScreen: 'login' }]);
    expect(driver.query).toHaveBeenCalledWith('SELECT "id", "spec" FROM "screens"');
  });
});

describe('stripSensitiveFields', () => {
  it('strips roleAccess and protectedScreens from appSpec', () => {
    const appSpec = {
      type: 'app',
      name: 'test-app',
      navigation: {
        type: 'sidebar',
        initialScreen: 'dashboard',
        menu: ['dashboard', 'admin', 'reports'],
        auth: {
          loginScreen: 'login',
          protectedScreens: ['dashboard', 'admin', 'reports'],
          roleAccess: { ADMIN: ['*'], EDITOR: ['dashboard'] },
          persistence: 'memory',
          authDomains: ['api.test.com'],
        },
      },
      screens: {
        login: { label: 'Login' },
        dashboard: { label: 'Dashboard' },
        admin: { label: 'Admin' },
      },
      tokens: { colors: { primary: '#1E40AF' } },
      layout: { root: 'app', elements: {} },
    };

    const stripped = stripSensitiveFields(appSpec);

    // Sensitive fields removed
    expect(((stripped.navigation as Record<string, unknown>).auth as Record<string, unknown>).roleAccess).toBeUndefined();
    expect(((stripped.navigation as Record<string, unknown>).auth as Record<string, unknown>).protectedScreens).toBeUndefined();

    // Non-sensitive fields preserved
    expect((stripped.navigation as Record<string, unknown>).menu).toEqual(['dashboard', 'admin', 'reports']);

    // Safe fields preserved
    expect(stripped.type).toBe('app');
    expect(stripped.name).toBe('test-app');
    expect((stripped.navigation as Record<string, unknown>).type).toBe('sidebar');
    expect((stripped.navigation as Record<string, unknown>).initialScreen).toBe('dashboard');
    expect(((stripped.navigation as Record<string, unknown>).auth as Record<string, unknown>).loginScreen).toBe('login');
    expect(((stripped.navigation as Record<string, unknown>).auth as Record<string, unknown>).persistence).toBe('memory');
    expect(((stripped.navigation as Record<string, unknown>).auth as Record<string, unknown>).authDomains).toEqual(['api.test.com']);
    expect(stripped.screens).toEqual(appSpec.screens);
    expect(stripped.tokens).toEqual(appSpec.tokens);
    expect(stripped.layout).toEqual(appSpec.layout);
  });

  it('returns appSpec unchanged when no navigation.auth exists', () => {
    const appSpec = {
      type: 'app',
      name: 'public-app',
      navigation: { type: 'sidebar', initialScreen: 'home' },
      screens: { home: { label: 'Home' } },
      layout: { root: 'app', elements: {} },
    };

    const stripped = stripSensitiveFields(appSpec);

    expect(stripped).toEqual(appSpec);
  });

  it('does not mutate the original appSpec', () => {
    const appSpec = {
      type: 'app',
      navigation: {
        type: 'sidebar',
        initialScreen: 'dash',
        menu: ['dash'],
        auth: {
          loginScreen: 'login',
          roleAccess: { admin: ['*'] },
          protectedScreens: ['dash'],
        },
      },
      screens: {},
      layout: { root: 'app', elements: {} },
    };

    stripSensitiveFields(appSpec);

    // Original still has all fields
    expect(appSpec.navigation.menu).toEqual(['dash']);
    expect(appSpec.navigation.auth.roleAccess).toEqual({ admin: ['*'] });
    expect(appSpec.navigation.auth.protectedScreens).toEqual(['dash']);
  });

  it('is idempotent — stripping already-stripped data produces same result', () => {
    const appSpec = {
      type: 'app',
      name: 'test',
      navigation: {
        type: 'sidebar',
        initialScreen: 'dashboard',
        menu: ['dashboard', 'admin'],
        auth: {
          loginScreen: 'login',
          protectedScreens: ['dashboard', 'admin'],
          roleAccess: { ADMIN: ['*'], EDITOR: ['dashboard'] },
          persistence: 'memory',
          authDomains: ['api.test.com'],
        },
      },
      screens: { login: { label: 'Login' }, dashboard: { label: 'Dashboard' } },
      layout: { root: 'app', elements: {} },
    };

    const stripped = stripSensitiveFields(appSpec);
    const doubleStripped = stripSensitiveFields(stripped);
    expect(doubleStripped).toEqual(stripped);
  });
});
