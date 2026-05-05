import { describe, it, expect, vi } from 'vitest';
import { checkScreensTable, buildSpecServingRoutes, stripSensitiveFields } from '../src/spec-serving.js';

function mockPoolForCheck(queryResult: unknown) {
  const mockRequest = {
    input: vi.fn().mockReturnThis(),
    query: vi.fn().mockResolvedValue(queryResult),
  };
  return { request: () => mockRequest };
}

describe('checkScreensTable', () => {
  it('returns true when table exists', async () => {
    const mockPool = mockPoolForCheck({ recordset: [{ TABLE_NAME: 'screens' }] });
    const exists = await checkScreensTable(mockPool as never, 'screens');
    expect(exists).toBe(true);
  });

  it('returns false when table does not exist', async () => {
    const mockPool = mockPoolForCheck({ recordset: [] });
    const exists = await checkScreensTable(mockPool as never, 'screens');
    expect(exists).toBe(false);
  });

  it('returns false on query error (graceful)', async () => {
    const mockRequest = {
      input: vi.fn().mockReturnThis(),
      query: vi.fn().mockRejectedValue(new Error('connection lost')),
    };
    const mockPool = { request: () => mockRequest };
    const exists = await checkScreensTable(mockPool as never, 'screens');
    expect(exists).toBe(false);
  });
});

describe('buildSpecServingRoutes', () => {
  it('loadScreen returns parsed spec', async () => {
    const specData = { root: 'page', elements: { page: { type: 'box' } } };
    const mockPool = {
      request: () => ({
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({ recordset: [{ spec: JSON.stringify(specData) }] }),
      }),
    };
    const routes = buildSpecServingRoutes(mockPool as never, 'screens');
    const result = await routes.loadScreen('task-manager');
    expect(result).toEqual(specData);
  });

  it('loadScreen returns null for missing screen', async () => {
    const mockPool = {
      request: () => ({
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({ recordset: [] }),
      }),
    };
    const routes = buildSpecServingRoutes(mockPool as never, 'screens');
    const result = await routes.loadScreen('nonexistent');
    expect(result).toBeNull();
  });

  it('loadApp returns spec only if type is app', async () => {
    const appSpec = { type: 'app', name: 'my-app' };
    const mockPool = {
      request: () => ({
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({ recordset: [{ spec: JSON.stringify(appSpec) }] }),
      }),
    };
    const routes = buildSpecServingRoutes(mockPool as never, 'screens');
    const result = await routes.loadApp('app-demo');
    expect(result).toEqual(appSpec);
  });

  it('loadApp returns null for non-app spec', async () => {
    const screenSpec = { root: 'page', elements: {} };
    const mockPool = {
      request: () => ({
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({ recordset: [{ spec: JSON.stringify(screenSpec) }] }),
      }),
    };
    const routes = buildSpecServingRoutes(mockPool as never, 'screens');
    const result = await routes.loadApp('task-manager');
    expect(result).toBeNull();
  });

  it('loadScreen returns null for type: "api" specs (never served to browser)', async () => {
    const apiSpec = { type: 'api', endpoints: {} };
    const mockPool = {
      request: () => ({
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({ recordset: [{ spec: JSON.stringify(apiSpec) }] }),
      }),
    };
    const routes = buildSpecServingRoutes(mockPool as never, 'screens');
    const result = await routes.loadScreen('my-api');
    expect(result).toBeNull();
  });

  it('loadApp returns null for type: "api" specs', async () => {
    const apiSpec = { type: 'api', endpoints: {} };
    const mockPool = {
      request: () => ({
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({ recordset: [{ spec: JSON.stringify(apiSpec) }] }),
      }),
    };
    const routes = buildSpecServingRoutes(mockPool as never, 'screens');
    const result = await routes.loadApp('my-api');
    expect(result).toBeNull();
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
